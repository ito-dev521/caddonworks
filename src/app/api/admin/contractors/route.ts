import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者メールチェック
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())
    const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

    // メンバーシップから管理者チェック
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

      // 運営会社のOrgAdminまたはAdminロールを持っているかチェック
      isOrgAdmin = memberships?.some((m: any) =>
        m.role === 'Admin' ||
        (m.role === 'OrgAdmin' && m.organizations?.name === '運営会社')
      ) || false
    }

    if (!isEmailAdmin && !isOrgAdmin) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }
    // メンバーシップから受注者を特定
    const { data: contractorMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        role,
        users!inner (
          id,
          email,
          display_name,
          organization,
          created_at,
          auth_user_id,
          formal_name,
          phone_number,
          member_level
        )
      `)
      .eq('role', 'Contractor')
      .order('created_at', { ascending: false })

    if (membershipError) {
      console.error('受注者取得エラー:', membershipError)

      // メンバーシップテーブルがない場合のフォールバック：全ユーザーから受注者らしきユーザーを取得
      const { data: allUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          display_name,
          organization,
          created_at,
          auth_user_id,
          formal_name,
          phone_number,
          member_level,
          role
        `)
        .order('created_at', { ascending: false })

      if (usersError) {
        return NextResponse.json({
          message: '受注者情報の取得に失敗しました',
          error: usersError.message
        }, { status: 500 })
      }

      // 受注者ロールのユーザーのみ抽出（memberships テーブルが使えない環境向けフォールバック）
      const contractors = allUsers?.filter(user => (user as any)?.role === 'Contractor') || []

      return NextResponse.json({
        contractors: contractors.map(user => ({
          ...user,
          role: (user as any)?.role || 'Contractor',
          active: true // 仮の状態を設定
        })),
        total: contractors.length,
        note: 'メンバーシップテーブルから取得できないため、推定で受注者を表示しています'
      }, { status: 200 })
    }

    // メンバーシップから受注者情報を取得
    let contractors = (contractorMemberships || [])
      .map(membership => ({
        id: (membership.users as any)?.id,
        email: (membership.users as any)?.email,
        display_name: (membership.users as any)?.display_name,
        organization: (membership.users as any)?.organization,
        role: membership.role,
        active: true, // メンバーシップが存在することで有効とみなす
        created_at: (membership.users as any)?.created_at,
        formal_name: (membership.users as any)?.formal_name,
        phone_number: (membership.users as any)?.phone_number,
        member_level: (membership.users as any)?.member_level
      }))

    // フォールバック: memberships に該当がない場合、users.role から推定
    if (!contractors || contractors.length === 0) {
      const { data: roleUsers, error: roleUsersError } = await supabaseAdmin
        .from('users')
        .select('id, email, display_name, organization, created_at, formal_name, phone_number, member_level, role')
        .eq('role', 'Contractor')
        .order('created_at', { ascending: false })

      if (!roleUsersError && roleUsers) {
        contractors = roleUsers.map((user: any) => ({
          id: user.id,
          email: user.email,
          display_name: user.display_name,
          organization: user.organization,
          role: user.role || 'Contractor',
          active: true,
          created_at: user.created_at,
          formal_name: user.formal_name,
          phone_number: user.phone_number,
          member_level: user.member_level
        }))
      }
    }

    return NextResponse.json({
      contractors: contractors,
      total: contractors.length
    }, { status: 200 })

  } catch (error) {
    console.error('受注者一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}