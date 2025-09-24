export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppAuthAccessToken, getBoxFileInfo } from '@/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const { fileId } = params
    const { searchParams } = new URL(request.url)
    const folderId = searchParams.get('folderId')
    const folderName = searchParams.get('folderName')

    // ユーザー認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, name, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'ユーザープロフィールが見つかりません' }, { status: 404 })
    }

    // 権限チェック
    const hasPermission = await checkDownloadPermission(userProfile.id, folderId, folderName)

    if (!hasPermission.allowed) {
      // ダウンロード試行ログを記録
      await logDownloadAttempt({
        userId: userProfile.id,
        userName: userProfile.name,
        fileId,
        folderId,
        folderName,
        result: 'blocked',
        reason: hasPermission.reason,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({
        error: 'ダウンロード権限がありません',
        reason: hasPermission.reason,
        folderId: folderId,
        folderName: folderName
      }, { status: 403 })
    }

    // 時間制限チェック
    const timeCheck = await checkTimeRestrictions(userProfile.id)
    if (!timeCheck.allowed) {
      await logDownloadAttempt({
        userId: userProfile.id,
        userName: userProfile.name,
        fileId,
        folderId,
        folderName,
        result: 'blocked',
        reason: timeCheck.reason,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({
        error: '現在の時間はダウンロードが制限されています',
        reason: timeCheck.reason
      }, { status: 403 })
    }

    // 日次制限チェック
    const limitCheck = await checkDailyLimits(userProfile.id)
    if (!limitCheck.allowed) {
      await logDownloadAttempt({
        userId: userProfile.id,
        userName: userProfile.name,
        fileId,
        folderId,
        folderName,
        result: 'blocked',
        reason: limitCheck.reason,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      })

      return NextResponse.json({
        error: '日次ダウンロード制限に達しています',
        reason: limitCheck.reason
      }, { status: 429 })
    }

    // Box API経由でファイル情報を取得
    const fileInfo = await getBoxFileInfo(fileId)

    // Box API経由でファイルをダウンロード
    const accessToken = await getAppAuthAccessToken()
    const response = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Box API error: ${response.status}`)
    }

    // 成功ログを記録
    await logDownloadAttempt({
      userId: userProfile.id,
      userName: userProfile.name,
      fileId,
      folderId,
      folderName,
      fileName: fileInfo.name,
      fileSize: fileInfo.size,
      result: 'success',
      reason: 'permission granted',
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown'
    })

    // 異常行動検知
    await detectAnomalousActivity(userProfile.id)

    // レスポンスヘッダーを設定してファイルを返す
    const headers = new Headers()
    headers.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream')
    headers.set('Content-Disposition', `attachment; filename="${fileInfo.name}"`)

    return new NextResponse(response.body, {
      status: 200,
      headers: headers
    })

  } catch (error: any) {
    console.error('❌ Box proxy download error:', error)
    return NextResponse.json({
      error: 'ダウンロードエラー',
      message: error.message
    }, { status: 500 })
  }
}

// 権限チェック関数
async function checkDownloadPermission(userId: string, folderId: string | null, folderName: string | null) {
  try {
    // データベースから実際の権限を取得
    const { data: permissions, error: permError } = await supabaseAdmin
      .from('box_permissions')
      .select('*')
      .eq('user_id', userId)

    if (permError) {
      console.error('Permission check error:', permError)
      // エラー時は安全側に倒してアクセス拒否
      return { allowed: false, reason: 'システムエラーのためアクセスを拒否しました' }
    }

    // フォルダタイプを特定
    let folderType = ''
    if (folderName) {
      if (folderName.includes('01_') || folderName.includes('受取')) {
        folderType = '01_received'
      } else if (folderName.includes('02_') || folderName.includes('作業')) {
        folderType = '02_work'
      } else if (folderName.includes('03_') || folderName.includes('納品')) {
        folderType = '03_delivery'
      } else if (folderName.includes('04_') || folderName.includes('契約')) {
        folderType = '04_contract'
      }
    }

    // 該当するフォルダの権限を取得
    const permission = permissions?.find(p => p.folder_type === folderType)

    if (permission) {
      if (!permission.can_download) {
        return {
          allowed: false,
          reason: `${permission.folder_name}フォルダはダウンロード権限がありません`
        }
      }
    } else {
      // 権限設定が見つからない場合はデフォルトで拒否
      return {
        allowed: false,
        reason: '該当フォルダのダウンロード権限が設定されていません'
      }
    }

    // 緊急停止チェック
    const emergencyStop = await checkEmergencyStop(userId)
    if (emergencyStop) {
      return { allowed: false, reason: '管理者により一時的にアクセスが停止されています' }
    }

    return { allowed: true, reason: 'permission granted' }

  } catch (error) {
    console.error('Permission check error:', error)
    return { allowed: false, reason: 'システムエラーのためアクセスを拒否しました' }
  }
}

// 時間制限チェック
async function checkTimeRestrictions(userId: string) {
  // 現在時刻をチェック（仮実装）
  const now = new Date()
  const hour = now.getHours()

  // 9時-18時の制限（設定可能にする予定）
  if (hour < 9 || hour >= 18) {
    return { allowed: false, reason: '業務時間外(9:00-18:00)のアクセスです' }
  }

  return { allowed: true, reason: 'within working hours' }
}

// 日次制限チェック
async function checkDailyLimits(userId: string) {
  // 今日のダウンロード数をチェック（仮実装）
  const today = new Date().toISOString().split('T')[0]

  // データベースから今日のダウンロード数を取得する処理
  // 仮で10件制限
  const dailyDownloads = 5 // 仮の値
  const maxDailyDownloads = 10

  if (dailyDownloads >= maxDailyDownloads) {
    return { allowed: false, reason: `日次制限(${maxDailyDownloads}件)に達しました` }
  }

  return { allowed: true, reason: `${dailyDownloads}/${maxDailyDownloads}件` }
}

// 緊急停止チェック
async function checkEmergencyStop(userId: string) {
  try {
    const { data: emergencyStop, error } = await supabaseAdmin
      .from('box_emergency_stops')
      .select('is_stopped')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Emergency stop check error:', error)
      return false
    }

    return emergencyStop?.is_stopped || false
  } catch (error) {
    console.error('Emergency stop check error:', error)
    return false
  }
}

// ダウンロード試行ログ
async function logDownloadAttempt(logData: any) {
  console.log('📊 Download attempt log:', logData)

  // 将来的にデータベースに記録
  try {
    await supabaseAdmin
      .from('box_download_logs')
      .insert({
        user_id: logData.userId,
        user_name: logData.userName,
        file_id: logData.fileId,
        folder_id: logData.folderId,
        folder_name: logData.folderName,
        file_name: logData.fileName,
        file_size: logData.fileSize,
        result: logData.result,
        reason: logData.reason,
        ip_address: logData.ipAddress,
        user_agent: logData.userAgent,
        attempted_at: new Date().toISOString()
      })
  } catch (error: any) {
    // テーブルが存在しない場合はエラーを無視
    if (!error.message?.includes('relation "box_download_logs" does not exist')) {
      console.error('Download log error:', error)
    }
  }
}

// 異常行動検知
async function detectAnomalousActivity(userId: string) {
  // 短時間での連続ダウンロード等を検知
  console.log(`🔍 Anomaly detection for user: ${userId}`)
  // 将来的に機械学習ベースの異常検知を実装
}