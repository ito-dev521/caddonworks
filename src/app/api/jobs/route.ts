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
    console.log('jobs API: リクエスト開始')
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    console.log('jobs API: 認証ヘッダー', authHeader ? 'あり' : 'なし')
    
    if (!authHeader) {
      console.log('jobs API: 認証ヘッダーなし')
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('jobs API: トークン取得完了', token.substring(0, 20) + '...')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('jobs API: 認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました: ' + (authError?.message || 'ユーザーが見つかりません') },
        { status: 401 }
      )
    }

    console.log('jobs API: 認証成功, ユーザーID:', user.id, 'Email:', user.email)

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('jobs API: ユーザープロフィールエラー:', userError)
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    console.log('jobs API: ユーザープロフィール取得成功')

    // 受注者向けの案件一覧を取得（入札可能な案件のみ）
    const { data: jobsData, error: jobsError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        description,
        status,
        budget,
        start_date,
        end_date,
        category,
        created_at,
        assignee_name,
        bidding_deadline,
        requirements,
        location,
        org_id
      `)
      .eq('status', 'bidding') // 入札中の案件のみ
      .order('created_at', { ascending: false })

    if (jobsError) {
      console.error('jobs API: 案件データ取得エラー:', jobsError)
      return NextResponse.json(
        { message: '案件データの取得に失敗しました: ' + jobsError.message },
        { status: 400 }
      )
    }

    console.log('jobs API: 案件データ取得成功, 件数:', jobsData?.length || 0)

    // 組織名を取得
    const orgIds = [...new Set(jobsData?.map(job => job.org_id) || [])]
    const { data: orgsData } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    const orgMap = orgsData?.reduce((acc: any, org: any) => {
      acc[org.id] = org.name
      return acc
    }, {}) || {}

    const formattedJobs = jobsData?.map(job => ({
      id: job.id,
      title: job.title,
      description: job.description,
      status: job.status,
      budget: job.budget,
      start_date: job.start_date,
      end_date: job.end_date,
      category: job.category || '道路設計',
      created_at: job.created_at,
      org_name: orgMap[job.org_id] || '不明な組織',
      org_id: job.org_id,
      assignee_name: job.assignee_name,
      bidding_deadline: job.bidding_deadline,
      requirements: job.requirements,
      location: job.location
    })) || []

    console.log('jobs API: レスポンス準備完了')

    return NextResponse.json({
      jobs: formattedJobs
    }, { status: 200 })

  } catch (error) {
    console.error('jobs API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
