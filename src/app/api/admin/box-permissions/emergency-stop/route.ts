export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { action, userId } = await request.json()

    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // 管理者メールアドレスチェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(user.email!)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 管理者ユーザープロファイルIDを取得
    const { data: adminProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    console.log('🔍 Admin profile lookup:', {
      authUserId: user.id,
      profileFound: !!adminProfile,
      profileId: adminProfile?.id
    })

    let affectedUsers: any[] = []
    let logMessage = ''

    switch (action) {
      case 'stop_all':
        // 全受注者のBox アクセスを停止
        const { data: contractors } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('role', 'contractor')

        affectedUsers = contractors || []
        logMessage = '全受注者のBoxアクセスを停止'

        // 各受注者の権限を一時停止状態に設定
        for (const contractor of affectedUsers) {
          await setEmergencyStop(contractor.id, true, adminProfile?.id, '管理者による緊急停止')
        }
        break

      case 'stop_user':
        if (!userId) {
          return NextResponse.json({ error: 'userIdが必要です' }, { status: 400 })
        }

        const { data: targetUser } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('id', userId)
          .single()

        if (targetUser) {
          affectedUsers = [targetUser]
          logMessage = `ユーザー ${targetUser.name} のBoxアクセスを停止`
          await setEmergencyStop(userId, true)
        }
        break

      case 'resume_all':
        // 全受注者のアクセス復旧
        const { data: allContractors } = await supabaseAdmin
          .from('users')
          .select('id, name, email')
          .eq('role', 'contractor')

        affectedUsers = allContractors || []
        logMessage = '全受注者のBoxアクセスを復旧'

        for (const contractor of affectedUsers) {
          await setEmergencyStop(contractor.id, false)
        }
        break

      default:
        return NextResponse.json({ error: '無効なアクションです' }, { status: 400 })
    }

    // 緊急操作ログを記録 (プロファイルIDを使用)
    const logData: any = {
      admin_email: user.email,
      action: action,
      affected_user_ids: affectedUsers.map(u => u.id),
      description: logMessage,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    }

    // プロファイルIDが存在する場合のみ admin_user_id を設定
    if (adminProfile?.id) {
      logData.admin_user_id = adminProfile.id
    } else {
      console.warn('⚠️ Admin profile not found for auth user:', user.id, 'email:', user.email)
    }

    console.log('📝 Emergency log data:', logData)

    // 緊急操作ログを安全に挿入（エラーを無視）
    try {
      const { error: logError } = await supabaseAdmin
        .from('emergency_actions_log')
        .insert(logData)

      if (logError) {
        console.error('Emergency log insert error:', {
          error: logError,
          logData: logData
        })
        // エラーが発生してもアプリケーションの処理は継続する
      } else {
        console.log('✅ Emergency action logged successfully')
      }
    } catch (error) {
      console.error('Emergency log insert exception:', error)
      // ログの保存に失敗しても緊急操作は継続する
    }

    // 全権限キャッシュをクリア
    await clearAllPermissionCaches()

    // 緊急通知を送信
    await sendEmergencyNotification(affectedUsers, action, user.email!)

    return NextResponse.json({
      success: true,
      message: logMessage,
      affectedUsers: affectedUsers.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Emergency stop error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// 緊急停止状態を設定
async function setEmergencyStop(userId: string, stopped: boolean, adminId?: string, reason?: string) {
  try {
    const updateData: any = {
      is_stopped: stopped,
      updated_at: new Date().toISOString()
    }

    if (stopped) {
      updateData.stopped_by = adminId
      updateData.stopped_at = new Date().toISOString()
      updateData.reason = reason || '管理者による停止'
    }

    const { error } = await supabaseAdmin
      .from('box_emergency_stops')
      .upsert(updateData)
      .eq('user_id', userId)

    if (error) {
      console.error('Emergency stop update error:', error)
    } else {
      console.log(`🚨 Emergency stop for user ${userId}: ${stopped}`)
    }
  } catch (error) {
    console.error('Emergency stop setting error:', error)
  }
}

// 全権限キャッシュクリア
async function clearAllPermissionCaches() {
  console.log('🗑️ Clear all permission caches')
  // 実装時：全ユーザーの権限キャッシュをクリア
}

// 緊急通知送信
async function sendEmergencyNotification(users: any[], action: string, adminEmail: string) {
  console.log(`📡 Send emergency notification for action: ${action} by ${adminEmail}`)
  console.log(`👥 Affected users: ${users.length}`)
  // 実装時：SlackやメールでのGJ急通知
}