import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendLevelChangeRequestNotificationToAdmin } from '@/lib/mailgun'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
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

    // ユーザープロフィール取得
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, member_level, level_change_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { requested_level } = body

    // バリデーション
    if (!requested_level || !['beginner', 'intermediate', 'advanced'].includes(requested_level)) {
      return NextResponse.json({ message: '無効な会員レベルです' }, { status: 400 })
    }

    // 既にリクエスト中の場合はエラー
    if (userProfile.level_change_status === 'pending') {
      return NextResponse.json({
        message: '既にレベル変更リクエストが承認待ちです'
      }, { status: 400 })
    }

    // 現在のレベルと同じ場合はエラー
    if (userProfile.member_level === requested_level) {
      return NextResponse.json({
        message: '現在のレベルと同じレベルは申請できません'
      }, { status: 400 })
    }

    // レベル変更リクエストを保存
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        requested_member_level: requested_level,
        level_change_status: 'pending',
        level_change_requested_at: new Date().toISOString(),
        level_change_notes: null
      })
      .eq('id', userProfile.id)

    if (updateError) {
      console.error('レベル変更リクエスト保存エラー:', updateError)
      return NextResponse.json({
        message: 'レベル変更リクエストの保存に失敗しました'
      }, { status: 500 })
    }

    // 運営者へメール通知送信
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '')
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0)

    if (adminEmails.length > 0) {
      try {
        await sendLevelChangeRequestNotificationToAdmin(
          userProfile.email,
          userProfile.display_name || userProfile.email,
          userProfile.member_level || 'beginner',
          requested_level as 'beginner' | 'intermediate' | 'advanced',
          adminEmails
        )
      } catch (emailError) {
        console.error('運営者通知メール送信エラー:', emailError)
        // メール送信エラーでもリクエスト自体は成功とする
      }
    }

    // 運営者へシステム通知送信
    try {
      // 運営会社のOrgAdminメンバーを取得
      const { data: operatorOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('name', '運営会社')
        .maybeSingle()

      if (operatorOrg) {
        const { data: adminMemberships } = await supabaseAdmin
          .from('memberships')
          .select('user_id')
          .eq('org_id', operatorOrg.id)
          .eq('role', 'OrgAdmin')

        if (adminMemberships && adminMemberships.length > 0) {
          const levelLabel = requested_level === 'beginner' ? '初級' : requested_level === 'intermediate' ? '中級' : '上級'
          const currentLevelLabel = userProfile.member_level === 'beginner' ? '初級' : userProfile.member_level === 'intermediate' ? '中級' : userProfile.member_level === 'advanced' ? '上級' : '未設定'

          // 各運営者に通知を作成
          const notifications = adminMemberships.map(membership => ({
            user_id: membership.user_id,
            type: 'member_level_change_request',
            title: '会員レベル変更申請',
            message: `${userProfile.display_name || userProfile.email} から会員レベル変更の申請がありました。（現在: ${currentLevelLabel} → 申請: ${levelLabel}）`,
            data: {
              contractor_id: userProfile.id,
              contractor_email: userProfile.email,
              contractor_name: userProfile.display_name || userProfile.email,
              current_level: userProfile.member_level || 'beginner',
              requested_level
            }
          }))

          await supabaseAdmin.from('notifications').insert(notifications)
        }
      }
    } catch (notificationError) {
      console.error('運営者システム通知送信エラー:', notificationError)
      // 通知エラーでもリクエスト自体は成功とする
    }

    return NextResponse.json({
      message: 'レベル変更リクエストを送信しました',
      requested_level
    }, { status: 200 })

  } catch (error) {
    console.error('レベル変更リクエストAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
