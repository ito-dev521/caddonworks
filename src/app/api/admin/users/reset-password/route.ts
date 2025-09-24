import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { generatePassword } from '@/lib/password-generator'

// 管理者が対象ユーザーのパスワードを即時リセット（ランダム再発行）するAPI
// 注意: 新しいパスワードはレスポンスで管理者へ返すため、取り扱いに注意。
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

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

    // 運営者権限チェック（本番時のみ厳格適用）
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('auth_user_id', user.id)
      .single()

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())

    const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

    let isMembershipAdmin = false
    const candidates = [userProfile?.id, user.id].filter(Boolean) as string[]
    for (const candidate of candidates) {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', candidate)
        .eq('role', 'Admin')
        .maybeSingle()
      if (membership) { isMembershipAdmin = true; break }
    }

    // 入力
    const body = await request.json()
    const { userId, mode } = body as { userId?: string; mode?: 'random' }
    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

    const isProd = (process.env.NEXT_PUBLIC_ENV === 'production' || process.env.NODE_ENV === 'production')
    // 権限: 本番では Admin か、同一組織の OrgAdmin に限定。開発/検証ではスキップ
    if (!isEmailAdmin && !isMembershipAdmin) {
      // 自分のプロフィールIDを取得
      const myProfileId = userProfile?.id
      if (!myProfileId) {
        return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 400 })
      }

      const { data: myMembership } = await supabaseAdmin
        .from('memberships')
        .select('org_id, role')
        .eq('user_id', myProfileId)
        .maybeSingle()

      const { data: targetMembership } = await supabaseAdmin
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .maybeSingle()

      const sameOrg = !!myMembership?.org_id && !!targetMembership?.org_id && myMembership.org_id === targetMembership.org_id
      const hasManagementRole = myMembership?.role === 'OrgAdmin' || myMembership?.role === 'Staff'

      console.log('権限チェック詳細:', {
        myProfileId,
        myMembership,
        targetMembership,
        sameOrg,
        hasManagementRole,
        role: myMembership?.role,
        userId
      })

      if (!(sameOrg && hasManagementRole)) {
        return NextResponse.json({
          message: '管理者権限が必要です。同一組織のOrgAdminまたはStaffである必要があります。',
          debug: {
            sameOrg,
            hasManagementRole,
            myRole: myMembership?.role,
            myOrgId: myMembership?.org_id,
            targetOrgId: targetMembership?.org_id
          }
        }, { status: 403 })
      }
    }

    // 対象ユーザー
    const { data: targetUser, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id')
      .eq('id', userId)
      .single()

    if (userErr || !targetUser) {
      return NextResponse.json({ message: '対象ユーザーが見つかりません' }, { status: 404 })
    }

    if (!targetUser.auth_user_id) {
      return NextResponse.json({ message: '認証ユーザーが未設定です。先に認証ユーザーを作成してください。' }, { status: 400 })
    }

    // 方式: 現状は即時ランダム再発行のみを提供
    const newPassword = generatePassword()
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(targetUser.auth_user_id, {
      password: newPassword
    })

    if (updErr) {
      console.error('パスワード更新エラー:', updErr)
      return NextResponse.json({ message: 'パスワードの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: 'パスワードをリセットしました', newPassword }, { status: 200 })

  } catch (error) {
    console.error('reset-password API エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}


