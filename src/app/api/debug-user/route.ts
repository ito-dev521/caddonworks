import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ message: 'email は必須です' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // 認証ユーザーの存在確認
    const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    })
    if (listErr) {
      return NextResponse.json({ message: 'authユーザー一覧の取得に失敗しました', error: listErr.message }, { status: 500 })
    }

    const authUser = usersList.users.find(u => (u.email || '').toLowerCase() === String(email).toLowerCase())

    // プロフィールの確認（email で照合）
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('email', String(email).toLowerCase())
      .maybeSingle()

    // プロフィールの確認（auth_user_id で照合）
    let userProfileByAuthId: any = null
    if (authUser?.id) {
      const { data: byAuth } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .maybeSingle()
      userProfileByAuthId = byAuth || null
    }

    // メンバーシップと組織の確認
    let memberships: any[] = []
    if (userProfile?.id) {
      const { data: mem } = await supabase
        .from('memberships')
        .select('role, org_id, organizations!inner(id, name, active, approval_status)')
        .eq('user_id', userProfile.id)
      memberships = mem || []
    } else if (authUser?.id) {
      // プロフィール未作成の場合は authUserId で試す
      const { data: mem } = await supabase
        .from('memberships')
        .select('role, org_id, organizations!inner(id, name, active, approval_status)')
        .eq('user_id', authUser.id)
      memberships = mem || []
    }

    const organizations = memberships.map((m: any) => m.organizations)

    return NextResponse.json({
      auth_user: authUser ? { id: authUser.id, email: authUser.email, confirmed_at: authUser.email_confirmed_at } : null,
      user_profile: userProfile || null,
      user_profile_by_auth_id: userProfileByAuthId,
      memberships_count: memberships.length,
      organizations
    }, { status: 200 })
  } catch (error) {
    console.error('debug-user API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


