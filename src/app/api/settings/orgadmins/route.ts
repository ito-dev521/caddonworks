import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '認証トークンが見つかりません' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 現在のユーザーのプロフィールとメンバーシップを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !memberships || (memberships.role !== 'OrgAdmin' && memberships.role !== 'Staff')) {
      return NextResponse.json({ message: 'OrgAdminまたはStaff権限が必要です' }, { status: 403 })
    }

    const orgId = memberships.org_id

    // 組織内のOrgAdminとStaffを取得（承認者として選択可能）
    const { data: orgAdmins, error: orgAdminsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        users (
          id,
          display_name,
          email
        )
      `)
      .eq('org_id', orgId)
      .in('role', ['OrgAdmin', 'Staff'])

    if (orgAdminsError) {
      return NextResponse.json({ message: 'OrgAdmin一覧の取得に失敗しました' }, { status: 500 })
    }

    const admins = orgAdmins.map(m => ({
      id: m.user_id,
      display_name: (m.users as any)?.display_name || 'N/A',
      email: (m.users as any)?.email || 'N/A'
    }))

    return NextResponse.json({ orgAdmins: admins }, { status: 200 })

  } catch (error) {
    console.error('OrgAdmin一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
