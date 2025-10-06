import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    console.log('🔍 運営ユーザーデバッグ開始...')

    // 1. 全組織確認
    const { data: allOrgs, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .order('created_at', { ascending: false })

    console.log('📋 全組織:', allOrgs)

    // 2. 運営会社組織確認
    const { data: operatorOrg, error: operatorOrgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('name', '運営会社')
      .maybeSingle()

    console.log('🏢 運営会社:', operatorOrg)

    // 3. 全ユーザー確認
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .order('created_at', { ascending: false })

    console.log('👥 全ユーザー:', allUsers?.slice(0, 5)) // 最新5件のみ

    // 4. 全メンバーシップ確認
    const { data: allMemberships, error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        org_id,
        role,
        users!inner(email, display_name),
        organizations!inner(name)
      `)
      .order('created_at', { ascending: false })

    console.log('🔗 全メンバーシップ:', allMemberships?.slice(0, 5)) // 最新5件のみ

    // 5. 運営組織のメンバーシップのみ
    let operatorMemberships: any[] = []
    if (operatorOrg?.id) {
      const { data } = await supabaseAdmin
        .from('memberships')
        .select(`
          user_id,
          role,
          users!inner(id, email, display_name),
          organizations!inner(name)
        `)
        .eq('org_id', operatorOrg.id)

      operatorMemberships = data || []
      console.log('🎯 運営組織メンバーシップ:', operatorMemberships)
    }

    return NextResponse.json({
      allOrgs: allOrgs || [],
      orgError: orgError?.message,
      operatorOrg,
      operatorOrgError: operatorOrgError?.message,
      allUsers: allUsers?.slice(0, 5) || [],
      usersError: usersError?.message,
      allMemberships: allMemberships?.slice(0, 5) || [],
      membershipsError: membershipsError?.message,
      operatorMemberships,
      summary: {
        totalOrgs: allOrgs?.length || 0,
        totalUsers: allUsers?.length || 0,
        totalMemberships: allMemberships?.length || 0,
        operatorMembershipsCount: operatorMemberships.length
      }
    })

  } catch (error: any) {
    console.error('❌ 運営ユーザーデバッグエラー:', error)
    return NextResponse.json({
      error: error.message || 'Unknown error',
      message: '運営ユーザーデバッグ失敗'
    }, { status: 500 })
  }
}