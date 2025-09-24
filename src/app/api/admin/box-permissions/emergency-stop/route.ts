export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

    let affectedUsers = []
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
          await setEmergencyStop(contractor.id, true)
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

    // 緊急操作ログを記録
    const { error: logError } = await supabaseAdmin
      .from('emergency_actions_log')
      .insert({
        admin_user_id: user.id,
        admin_email: user.email,
        action: action,
        affected_user_ids: affectedUsers.map(u => u.id),
        description: logMessage,
        executed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    // テーブルが存在しない場合はエラーを無視
    if (logError && !logError.message.includes('relation "emergency_actions_log" does not exist')) {
      console.error('Emergency log insert error:', logError)
    }

    // 全権限キャッシュをクリア
    await clearAllPermissionCaches()

    // 緊急通知を送信
    await sendEmergencyNotification(affectedUsers, action, user.email)

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
async function setEmergencyStop(userId: string, stopped: boolean) {
  console.log(`🚨 Emergency stop for user ${userId}: ${stopped}`)
  // 実装時：緊急停止フラグをデータベースまたはキャッシュに設定
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