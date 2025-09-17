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

    // 案件データを取得（認証なしでテスト）
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('status', 'bidding')
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('案件取得エラー:', projectsError)
      return NextResponse.json({ message: '案件の取得に失敗しました' }, { status: 500 })
    }


    // 組織情報を個別に取得
    const orgIds = Array.from(new Set(projects?.map(p => p.org_id) || []))
    let orgMap: any = {}
    
    if (orgIds.length > 0) {
      const { data: organizations } = await supabaseAdmin
        .from('organizations')
        .select('id, name')
        .in('id', orgIds)
      
      orgMap = organizations?.reduce((acc: any, org: any) => {
        acc[org.id] = org
        return acc
      }, {}) || {}
    }

    // データを結合
    const jobsData = projects?.map(project => ({
      ...project,
      org_name: orgMap[project.org_id]?.name || '不明な組織'
    })) || []


    return NextResponse.json({ jobs: jobsData }, { status: 200 })

  } catch (error) {
    console.error('jobs-test API: エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}