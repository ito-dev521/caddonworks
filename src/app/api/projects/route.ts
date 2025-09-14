import { NextRequest, NextResponse } from 'next/server'
import { supabase, createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      budget,
      start_date,
      end_date,
      category,
      contractor_id
    } = body

    // バリデーション
    if (!title || !description || !budget || !start_date || !end_date || !category) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザーの組織情報を取得
    console.log('ユーザーID:', user.id)
    console.log('ユーザーEmail:', user.email)
    
    // まず、usersテーブルでユーザーが存在するか確認
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    console.log('ユーザープロフィール:', userProfile)
    console.log('ユーザープロフィールエラー:', userError)

    if (userError || !userProfile) {
      console.error('ユーザープロフィールが見つかりません:', userError)
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません。デモアカウントを再作成してください。' },
        { status: 403 }
      )
    }
    
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select(`
        org_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userProfile.id)

    console.log('メンバーシップ情報:', memberships)
    console.log('メンバーシップエラー:', membershipError)

    if (membershipError || !memberships || memberships.length === 0) {
      console.error('組織情報の取得に失敗:', membershipError)
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました: ' + (membershipError?.message || 'メンバーシップが見つかりません') },
        { status: 403 }
      )
    }

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（OrgAdmin権限が必要です）' },
        { status: 403 }
      )
    }

    const company = membership.organizations as any

    // 新規案件を作成（Service Role Keyを使用してRLSをバイパス）
    const supabaseAdmin = createSupabaseAdmin()
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        title,
        description,
        budget: Number(budget),
        start_date,
        end_date,
        category,
        contractor_id: contractor_id || null,
        org_id: company.id,
        status: 'bidding' // デフォルトは入札中
      })
      .select()
      .single()

    if (projectError) {
      console.error('案件作成エラー:', projectError)
      return NextResponse.json(
        { message: '案件の作成に失敗しました: ' + projectError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '案件が正常に作成されました',
      project: projectData
    }, { status: 201 })

  } catch (error) {
    console.error('案件作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // まず、usersテーブルでユーザーが存在するか確認
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません。デモアカウントを再作成してください。' },
        { status: 403 }
      )
    }

    // ユーザーの組織情報を取得
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select(`
        org_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（OrgAdmin権限が必要です）' },
        { status: 403 }
      )
    }

    const company = membership.organizations as any

    // 組織の案件データを取得（会社間分離、Service Role Keyを使用）
    const supabaseAdmin = createSupabaseAdmin()
    const { data: projectsData, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        description,
        status,
        budget,
        start_date,
        end_date,
        contractor_id,
        category,
        created_at,
        contractor:users!projects_contractor_id_fkey (
          display_name,
          email
        )
      `)
      .eq('org_id', company.id) // 組織IDでフィルタリング
      .order('created_at', { ascending: false })

    if (projectsError) {
      console.error('案件データの取得に失敗:', projectsError)
      return NextResponse.json(
        { message: '案件データの取得に失敗しました' },
        { status: 400 }
      )
    }

    const formattedProjects = projectsData?.map(project => ({
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget,
      start_date: project.start_date,
      end_date: project.end_date,
      contractor_id: project.contractor_id,
      contractor_name: (project.contractor as any)?.display_name || '未割当',
      contractor_email: (project.contractor as any)?.email || '',
      progress: Math.floor(Math.random() * 100), // 実際の進捗計算ロジックに置き換え
      category: project.category || '道路設計',
      created_at: project.created_at
    })) || []

    return NextResponse.json({
      projects: formattedProjects
    }, { status: 200 })

  } catch (error) {
    console.error('案件取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
