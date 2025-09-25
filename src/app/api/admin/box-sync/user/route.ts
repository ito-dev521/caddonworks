export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { findOrCreateBoxUser, syncUserBoxPermissions } from '@/lib/box-collaboration'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * ユーザーのBox同期を実行
 */
export async function POST(request: NextRequest) {
  try {
    const { userId, boxEmail, boxLogin } = await request.json()

    console.log('🔄 Box ユーザー同期開始:', { userId, boxEmail, boxLogin })

    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !authUser) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // 管理者チェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(authUser.email!)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // ユーザー情報を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    console.log('👤 同期対象ユーザー:', user.display_name)

    // Box ユーザーを検索または作成
    const boxUserResult = await findOrCreateBoxUser(
      boxEmail || boxLogin || user.email,
      user.display_name
    )

    if (!boxUserResult.success) {
      console.error('❌ Box ユーザー作成失敗:', boxUserResult.error)

      // エラーログを記録
      await logBoxSync({
        userId,
        action: 'user_creation_failed',
        status: 'failed',
        errorMessage: boxUserResult.error,
        syncedBy: authUser.id
      })

      return NextResponse.json({
        success: false,
        error: 'Box ユーザーの作成に失敗しました',
        details: boxUserResult.error
      }, { status: 500 })
    }

    console.log('✅ Box ユーザー確認完了:', boxUserResult.boxUserLogin)

    // ユーザー情報を更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        box_user_id: boxUserResult.boxUserId,
        box_email: boxUserResult.boxUserLogin,
        box_login: boxUserResult.boxUserLogin,
        box_sync_status: 'syncing',
        box_last_synced_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ ユーザー情報更新エラー:', updateError)
    }

    // 現在の権限設定を取得
    const { data: permissions } = await supabaseAdmin
      .from('box_permissions')
      .select('*')
      .eq('user_id', userId)

    console.log('📋 権限設定取得:', permissions?.length || 0, '件')

    // デフォルトフォルダ設定（実際のプロジェクトフォルダIDに置き換える必要があります）
    const defaultFolders = [
      { id: 'folder_01_received', name: '01_受取データ', type: '01_received' },
      { id: 'folder_02_work', name: '02_作業データ', type: '02_work' },
      { id: 'folder_03_delivery', name: '03_納品データ', type: '03_delivery' },
      { id: 'folder_04_contract', name: '04_契約データ', type: '04_contract' }
    ]

    // 権限データを整形
    const boxPermissions = defaultFolders.map(folder => {
      const permission = permissions?.find(p => p.folder_type === folder.type)
      return {
        folderId: folder.id,
        folderName: folder.name,
        preview: permission?.can_preview ?? true,
        download: permission?.can_download ?? false,
        upload: permission?.can_upload ?? false,
        edit: permission?.can_edit ?? false
      }
    })

    console.log('🔧 Box権限同期中...')

    // Box権限を同期
    const syncResult = await syncUserBoxPermissions(
      userId,
      boxUserResult.boxUserId!,
      boxPermissions
    )

    // 成功ログを記録
    await logBoxSync({
      userId,
      boxUserId: boxUserResult.boxUserId,
      action: 'permissions_synced',
      status: syncResult.success ? 'success' : 'partial_success',
      errorMessage: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : undefined,
      syncedBy: authUser.id,
      apiResponse: {
        syncedPermissions: syncResult.syncedPermissions,
        totalPermissions: boxPermissions.length,
        errors: syncResult.errors
      }
    })

    // 最終同期状態を更新
    await supabaseAdmin
      .from('users')
      .update({
        box_sync_status: syncResult.success ? 'synced' : 'partial_failure',
        box_last_synced_at: new Date().toISOString()
      })
      .eq('id', userId)

    console.log(`🎉 Box同期完了: ${syncResult.syncedPermissions}/${boxPermissions.length}`)

    return NextResponse.json({
      success: true,
      message: 'Box同期が完了しました',
      boxUserId: boxUserResult.boxUserId,
      boxUserLogin: boxUserResult.boxUserLogin,
      syncedPermissions: syncResult.syncedPermissions,
      totalPermissions: boxPermissions.length,
      errors: syncResult.errors
    })

  } catch (error: any) {
    console.error('❌ Box同期エラー:', error)
    return NextResponse.json({
      success: false,
      error: 'Box同期中にエラーが発生しました',
      details: error.message
    }, { status: 500 })
  }
}

/**
 * Box同期ログを記録
 */
async function logBoxSync(logData: {
  userId: string
  boxUserId?: string
  action: string
  status: 'success' | 'failed' | 'partial_success'
  errorMessage?: string
  syncedBy: string
  apiResponse?: any
  folderId?: string
  folderName?: string
}) {
  try {
    await supabaseAdmin
      .from('box_sync_logs')
      .insert({
        user_id: logData.userId,
        box_user_id: logData.boxUserId,
        action: logData.action,
        folder_id: logData.folderId,
        folder_name: logData.folderName,
        status: logData.status,
        error_message: logData.errorMessage,
        api_response: logData.apiResponse,
        synced_by: logData.syncedBy,
        synced_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('📊 ログ記録エラー:', error)
  }
}

/**
 * ユーザーのBox同期状況を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'userIdが必要です' }, { status: 400 })
    }

    // 管理者権限チェック（省略）

    // 同期状況を取得
    const { data: syncStatus, error } = await supabaseAdmin
      .from('user_box_sync_status')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return NextResponse.json({ error: '同期状況取得エラー' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      syncStatus
    })

  } catch (error: any) {
    console.error('❌ 同期状況取得エラー:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}