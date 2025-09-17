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

    // 発注者アカウント（admin@demo.com）の情報を確認
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')

    if (usersError || !users || users.length === 0) {
      return NextResponse.json({
        message: '発注者アカウントが見つかりません',
        error: usersError?.message
      })
    }

    const adminUser = users[0]

    // 発注者のメンバーシップ情報を確認
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        id,
        role,
        org_id,
        organizations (
          id,
          name,
          email,
          description
        )
      `)
          .eq('user_id', adminUser.id)

    // 発注者の組織の案件を確認
    let adminProjects = []
    if (memberships && memberships.length > 0) {
      const orgIds = memberships.map(m => m.org_id)
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('*')
            .in('org_id', orgIds)

      adminProjects = projects || []
    }

    // 全案件の確認（デバッグ用）
    const { data: allProjects, error: allProjectsError } = await supabaseAdmin
      .from('projects')
          .select('*')

    return NextResponse.json({
      message: '発注者組織情報確認完了',
      data: {
        adminUser,
        memberships: memberships || [],
        adminProjects: adminProjects || [],
        allProjects: allProjects || []
      }
    })

  } catch (error) {
    console.error('check-admin-org API: エラー', error)
    return NextResponse.json(
      { message: '発注者組織情報確認エラー', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
