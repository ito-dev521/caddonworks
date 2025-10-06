import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  sendLevelChangeApprovedEmail,
  sendLevelChangeRejectedEmail,
  sendLevelChangedByAdminEmail
} from '@/lib/mailgun'
  import { getMemberLevelInfo } from '@/lib/member-level'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者権限チェック
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())
    const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    let isOrgAdmin = false
    if (userProfile?.id) {
      const { data: memberships } = await supabaseAdmin
        .from('memberships')
        .select('role, organizations!inner(name)')
        .eq('user_id', userProfile.id)
        .in('role', ['Admin', 'OrgAdmin'])

      isOrgAdmin = memberships?.some((m: any) =>
        m.role === 'Admin' ||
        (m.role === 'OrgAdmin' && m.organizations?.name === '運営会社')
      ) || false
    }

    if (!isEmailAdmin && !isOrgAdmin) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { action, new_level, rejection_reason } = body

    // アクションバリデーション
    if (!action || !['approve', 'reject', 'change'].includes(action)) {
      return NextResponse.json({ message: '無効なアクションです' }, { status: 400 })
    }

    // 対象ユーザー取得
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', params.id)
      .maybeSingle()

    if (userError || !targetUser) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 })
    }

    let updateData: any = {}

    let approvedLevel: string | null = null

    if (action === 'approve') {
      // 承認
      if (!targetUser.requested_member_level) {
        return NextResponse.json({ message: '変更リクエストが見つかりません' }, { status: 400 })
      }

      approvedLevel = targetUser.requested_member_level
      updateData = {
        member_level: targetUser.requested_member_level,
        level_change_status: 'approved',
        level_change_reviewed_at: new Date().toISOString(),
        level_change_reviewed_by: userProfile?.id,
        level_change_notes: null
      }

    } else if (action === 'reject') {
      // 却下
      if (!targetUser.requested_member_level) {
        return NextResponse.json({ message: '変更リクエストが見つかりません' }, { status: 400 })
      }

      updateData = {
        requested_member_level: null,
        level_change_status: 'rejected',
        level_change_reviewed_at: new Date().toISOString(),
        level_change_reviewed_by: userProfile?.id,
        level_change_notes: rejection_reason || '運営側により却下されました'
      }

    } else if (action === 'change') {
      // 直接変更
      if (!new_level || !['beginner', 'intermediate', 'advanced'].includes(new_level)) {
        return NextResponse.json({ message: '無効な会員レベルです' }, { status: 400 })
      }

      updateData = {
        member_level: new_level,
        requested_member_level: null,
        level_change_status: 'approved',
        level_change_reviewed_at: new Date().toISOString(),
        level_change_reviewed_by: userProfile?.id,
        level_change_notes: '運営側により直接変更されました'
      }
    }

    // データベース更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', params.id)

    if (updateError) {
      console.error('レベル更新エラー:', updateError)
      return NextResponse.json({ message: 'レベルの更新に失敗しました' }, { status: 500 })
    }

    // メール送信
    const userName = targetUser.display_name || targetUser.email
    const levelLabel = (level?: string | null) => level ? getMemberLevelInfo(level as any).label : ''

    if (action === 'approve') {
      const approved = approvedLevel || targetUser.requested_member_level
      await sendLevelChangeApprovedEmail(
        targetUser.email,
        userName,
        approved as 'beginner' | 'intermediate' | 'advanced'
      )

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          type: 'member_level_request_approved',
          title: '会員レベル申請が承認されました',
          message: `会員レベルが ${levelLabel(approved)} に更新されました。`,
          data: {
            new_level: approved
          }
        })

      if (notificationError) {
        console.error('レベル変更承認通知の作成に失敗しました:', notificationError)
      }
    } else if (action === 'reject') {
      const reason = rejection_reason || '運営側により却下されました'
      await sendLevelChangeRejectedEmail(
        targetUser.email,
        userName,
        reason
      )

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          type: 'member_level_request_rejected',
          title: '会員レベル申請が却下されました',
          message: `会員レベル申請が却下されました。理由: ${reason}`,
          data: {
            reason
          }
        })

      if (notificationError) {
        console.error('レベル変更却下通知の作成に失敗しました:', notificationError)
      }
    } else if (action === 'change') {
      await sendLevelChangedByAdminEmail(
        targetUser.email,
        userName,
        new_level as 'beginner' | 'intermediate' | 'advanced'
      )

      const { error: notificationError } = await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: targetUser.id,
          type: 'member_level_changed',
          title: '会員レベルが更新されました',
          message: `会員レベルが ${levelLabel(new_level)} に更新されました。`,
          data: {
            new_level
          }
        })

      if (notificationError) {
        console.error('レベル変更通知の作成に失敗しました:', notificationError)
      }
    }

    return NextResponse.json({
      message: 'レベルを更新しました',
      action,
      new_level: action === 'change' ? new_level : targetUser.requested_member_level
    }, { status: 200 })

  } catch (error) {
    console.error('レベル変更APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
