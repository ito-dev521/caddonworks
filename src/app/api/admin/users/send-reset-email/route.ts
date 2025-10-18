import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 管理者が対象ユーザーへパスワードリセットメールを送信するAPI
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

    // Admin 権限判定
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
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
    const { userId } = body as { userId?: string }
    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // 対象ユーザーを取得
    const { data: targetUser, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id')
      .eq('id', userId)
      .single()

    if (userErr || !targetUser) {
      return NextResponse.json({ message: '対象ユーザーが見つかりません' }, { status: 404 })
    }

    // 権限: Admin か、同一組織の OrgAdmin であること
    if (!isEmailAdmin && !isMembershipAdmin) {
      // userProfile.id が属する org と、対象ユーザーの org が同じか確認
      const { data: myMembership } = await supabaseAdmin
        .from('memberships')
        .select('org_id, role')
        .eq('user_id', userProfile?.id || user.id)
        .maybeSingle()

      const { data: targetMembership } = await supabaseAdmin
        .from('memberships')
        .select('org_id')
        .eq('user_id', userId)
        .maybeSingle()

      const sameOrg = !!myMembership?.org_id && !!targetMembership?.org_id && myMembership.org_id === targetMembership.org_id
      const isOrgAdmin = myMembership?.role === 'OrgAdmin'
      if (!(sameOrg && isOrgAdmin)) {
        return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
      }
    }

    if (!targetUser.auth_user_id) {
      return NextResponse.json({ message: '認証ユーザーが未設定です。先に認証ユーザーを作成してください。' }, { status: 400 })
    }

    // auth.users に実際にユーザーが存在するか確認
    const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(targetUser.auth_user_id)

    console.log('🔍 Auth ユーザー詳細:', {
      hasUser: !!authUser?.user,
      email: authUser?.user?.email,
      emailConfirmedAt: authUser?.user?.email_confirmed_at,
      bannedUntil: authUser?.user?.banned_until,
      confirmationSentAt: authUser?.user?.confirmation_sent_at,
      authUserError
    })

    if (authUserError || !authUser || !authUser.user) {
      console.error('Auth ユーザー確認エラー:', authUserError)
      return NextResponse.json({
        message: `このユーザーは認証システムに登録されていません。メールアドレス: ${targetUser.email}`,
        detail: '先に認証ユーザーを作成してください。'
      }, { status: 400 })
    }

    // Authユーザーのメールアドレスが一致するか確認
    if (authUser.user.email !== targetUser.email) {
      console.error('メールアドレス不一致:', {
        usersTable: targetUser.email,
        authTable: authUser.user.email
      })
      return NextResponse.json({
        message: 'ユーザーテーブルと認証テーブルのメールアドレスが一致しません',
        detail: 'データの整合性を確認してください'
      }, { status: 400 })
    }

    // リセット用マジックリンク（Supabaseのパスワード回復）
    // リダイレクト先は /auth/reset-password に統一
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
    const { error: linkErr } = await supabaseAdmin.auth.resetPasswordForEmail(targetUser.email, {
      redirectTo
    })

    if (linkErr) {
      console.error('リセットメール送信エラー:', linkErr)

      // より詳細なエラーメッセージ
      let errorMessage = 'リセットメールの送信に失敗しました'
      if ((linkErr as any).code === 'email_address_invalid') {
        errorMessage = `メールアドレス "${targetUser.email}" が認証システムに登録されていません。先にユーザー登録を完了してください。`
      } else if ((linkErr as any).message) {
        errorMessage = `リセットメール送信エラー: ${(linkErr as any).message}`
      }

      return NextResponse.json({
        message: errorMessage,
        errorCode: (linkErr as any).code || 'unknown'
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'リセットメールを送信しました' }, { status: 200 })

  } catch (error) {
    console.error('send-reset-email API エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


