import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const results: any = {
      timestamp: new Date().toISOString(),
      checks: []
    }

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

    results.checks.push({
      check: 'Authentication',
      status: 'success',
      user: { id: user.id, email: user.email }
    })

    // ユーザープロフィールチェック
    try {
      const { data: userProfile, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, display_name')
        .eq('auth_user_id', user.id)
        .single()

      if (userError) throw userError

      results.checks.push({
        check: 'User Profile',
        status: 'success',
        data: userProfile
      })

      // メンバーシップチェック
      try {
        const { data: memberships, error: membershipError } = await supabaseAdmin
          .from('memberships')
          .select('id, org_id, role')
          .eq('user_id', userProfile.id)

        if (membershipError) throw membershipError

        results.checks.push({
          check: 'Memberships',
          status: 'success',
          count: memberships?.length || 0,
          data: memberships
        })

        // 組織チェック
        if (memberships && memberships.length > 0) {
          try {
            const orgIds = memberships.map(m => m.org_id)
            const { data: organizations, error: orgError } = await supabaseAdmin
              .from('organizations')
              .select('id, name')
              .in('id', orgIds)

            if (orgError) throw orgError

            results.checks.push({
              check: 'Organizations',
              status: 'success',
              count: organizations?.length || 0,
              data: organizations
            })
          } catch (orgError: any) {
            results.checks.push({
              check: 'Organizations',
              status: 'error',
              error: orgError.message
            })
          }
        }

        // プロジェクトチェック
        if (memberships && memberships.length > 0) {
          try {
            const orgId = memberships[0].org_id
            const { data: projects, error: projectError } = await supabaseAdmin
              .from('projects')
              .select('id, title')
              .eq('org_id', orgId)
              .limit(5)

            if (projectError) throw projectError

            results.checks.push({
              check: 'Projects',
              status: 'success',
              count: projects?.length || 0
            })
          } catch (projectError: any) {
            results.checks.push({
              check: 'Projects',
              status: 'error',
              error: projectError.message
            })
          }
        }

      } catch (membershipError: any) {
        results.checks.push({
          check: 'Memberships',
          status: 'error',
          error: membershipError.message,
          details: membershipError
        })
      }

    } catch (userError: any) {
      results.checks.push({
        check: 'User Profile',
        status: 'error',
        error: userError.message
      })
    }

    return NextResponse.json(results, { status: 200 })

  } catch (error: any) {
    return NextResponse.json({
      message: 'デバッグチェック失敗',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
