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
    console.log('check-jobs-data API: 開始')

    // 1. 案件データの確認
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })

    console.log('check-jobs-data API: 案件データ取得結果', { 
      count: projects?.length || 0, 
      error: projectsError?.message 
    })

    // 2. 入札可能な案件の確認
    const { data: biddingProjects, error: biddingError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('status', 'bidding')

    console.log('check-jobs-data API: 入札可能案件取得結果', { 
      count: biddingProjects?.length || 0, 
      error: biddingError?.message 
    })

    // 3. 組織データの確認
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .limit(5)

    console.log('check-jobs-data API: 組織データ取得結果', { 
      count: organizations?.length || 0, 
      error: orgError?.message 
    })

    // 4. 案件ステータス別の集計
    const { data: statusCounts, error: statusError } = await supabaseAdmin
      .from('projects')
      .select('status')
      .not('status', 'is', null)

    const statusSummary = statusCounts?.reduce((acc: any, item: any) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {}) || {}

    console.log('check-jobs-data API: ステータス集計結果', statusSummary)

    return NextResponse.json({
      message: 'データ確認完了',
      data: {
        totalProjects: projects?.length || 0,
        biddingProjectsCount: biddingProjects?.length || 0,
        organizationsCount: organizations?.length || 0,
        statusSummary,
        projects: projects?.slice(0, 3) || [], // 最初の3件のみ表示
        biddingProjects: biddingProjects || [],
        organizations: organizations || []
      },
      errors: {
        projects: projectsError?.message,
        bidding: biddingError?.message,
        organizations: orgError?.message,
        status: statusError?.message
      }
    })

  } catch (error) {
    console.error('check-jobs-data API: エラー', error)
    return NextResponse.json(
      { message: 'データ確認エラー', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
