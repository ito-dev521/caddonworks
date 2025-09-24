export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: NextRequest) {
  try {
    const { userId, folderId, permissionType, value } = await request.json()

    if (!userId || !folderId || !permissionType || typeof value !== 'boolean') {
      return NextResponse.json({
        error: '必要なパラメータが不足しています'
      }, { status: 400 })
    }

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

    // 現在の値を取得
    const { data: currentPermission, error: currentError } = await supabaseAdmin
      .from('box_permissions')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_type', folderId)
      .single()

    const oldValue = currentPermission ? currentPermission[`can_${permissionType}`] : null

    // Box権限設定を更新
    const updateData = {
      [`can_${permissionType}`]: value,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabaseAdmin
      .from('box_permissions')
      .update(updateData)
      .eq('user_id', userId)
      .eq('folder_type', folderId)

    if (updateError) {
      console.error('Permission update error:', updateError)
      return NextResponse.json({
        success: false,
        error: '権限更新に失敗しました',
        details: updateError.message
      }, { status: 500 })
    }

    console.log(`📝 Box権限変更成功: ${userId} - ${folderId} - ${permissionType}: ${oldValue} → ${value}`)

    // 変更ログをデータベースに記録
    const { error: logError } = await supabaseAdmin
      .from('box_permission_logs')
      .insert({
        admin_user_id: user.id,
        target_user_id: userId,
        folder_id: folderId,
        permission_type: permissionType,
        old_value: oldValue,
        new_value: value,
        changed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })

    if (logError) {
      console.error('Log insert error:', logError)
      // ログエラーは処理を停止しない
    }

    // 権限キャッシュをクリア（実装時）
    await clearPermissionCache(userId)

    // リアルタイム通知（WebSocket実装時）
    await notifyPermissionChange(userId, {
      folderId,
      permissionType,
      value,
      changedBy: user.email
    })

    return NextResponse.json({
      success: true,
      message: '権限設定を更新しました',
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('❌ Permission update error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

// 権限キャッシュクリア（将来実装）
async function clearPermissionCache(userId: string) {
  console.log(`🗑️ Clear permission cache for user: ${userId}`)
  // Redis/Memcache等のキャッシュクリア処理
}

// リアルタイム通知（将来実装）
async function notifyPermissionChange(userId: string, change: any) {
  console.log(`📡 Notify permission change to user: ${userId}`, change)
  // WebSocket/Server-Sent Events での通知処理
}