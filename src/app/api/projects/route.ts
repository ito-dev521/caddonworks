import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service roleキーでSupabaseクライアントを作成（RLSをバイパス）
console.log('環境変数チェック:')
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '設定済み' : '未設定')

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      budget,
      start_date,
      end_date,
      bidding_deadline,
      category,
      contractor_id,
      assignee_name,
      required_contractors = 1,
      required_level = 'beginner'
    } = body

    // バリデーション
    if (!title || !description || !budget || !start_date || !end_date || !bidding_deadline || !category) {
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
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
    const { data: userProfile, error: userError } = await supabaseAdmin
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
    
    const { data: memberships, error: membershipError } = await supabaseAdmin
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

    // 挿入するデータを準備してログ出力
    const insertData: any = {
      title,
      description,
      budget: Number(budget),
      start_date,
      end_date,
      bidding_deadline,
      category,
      contractor_id: contractor_id || null,
      assignee_name: assignee_name || null,
      org_id: company.id,
      status: 'bidding' // デフォルトは入札中
    }

    // required_contractorsカラムが存在する場合のみ追加
    // データベーススキーマが更新されていない場合の回避策
    if (required_contractors !== undefined) {
      insertData.required_contractors = Number(required_contractors)
    }
    
    // required_levelカラムが存在する場合のみ追加
    if (required_level !== undefined) {
      insertData.required_level = required_level
    }

    console.log('挿入データ:', insertData)
    console.log('company.id:', company.id)
    console.log('company:', company)

    // Service roleクライアントのテスト
    console.log('supabaseAdminクライアント作成完了')

    // 認証済みユーザーとして新規案件を作成（RLSをバイパス）
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert(insertData)
      .select()
      .single()

    if (projectError) {
      console.error('案件作成エラー:', projectError)
      
      // required_contractorsカラムが存在しない場合の特別な処理
      if (projectError.message.includes('required_contractors')) {
        return NextResponse.json(
          { 
            message: 'データベーススキーマが古いです。required_contractorsカラムを追加してください。',
            error: projectError.message,
            suggestion: 'SupabaseのSQLエディタでadd-required-contractors-column.sqlを実行してください。'
          },
          { status: 500 }
        )
      }
      
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
    console.log('projects API: リクエスト開始')
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    console.log('projects API: 認証ヘッダー', authHeader ? 'あり' : 'なし')
    
    if (!authHeader) {
      console.log('projects API: 認証ヘッダーなし')
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('projects API: トークン取得完了', token.substring(0, 20) + '...')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('projects API: 認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました: ' + (authError?.message || 'ユーザーが見つかりません') },
        { status: 401 }
      )
    }

    console.log('projects API: 認証成功, ユーザーID:', user.id, 'Email:', user.email)

    // まず、usersテーブルでユーザーが存在するか確認
    const { data: userProfile, error: userError } = await supabaseAdmin
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
    const { data: memberships, error: membershipError } = await supabaseAdmin
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

    // クエリパラメータを取得
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status')

    // 組織の案件データを取得（会社間分離）
    let query = supabaseAdmin
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
        assignee_name,
        category,
        created_at
      `)
      .eq('org_id', company.id) // 組織IDでフィルタリング

    // ステータスフィルタを適用
    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: projectsData, error: projectsError } = await query.order('created_at', { ascending: false })

    if (projectsError) {
      console.error('案件データの取得に失敗:', projectsError)
      return NextResponse.json(
        { message: '案件データの取得に失敗しました' },
        { status: 400 }
      )
    }

    // 受注者情報を取得
    const contractorIds = Array.from(new Set(projectsData?.map(p => p.contractor_id).filter(Boolean) || []))
    let contractorMap: any = {}
    
    if (contractorIds.length > 0) {
      const { data: contractors } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .in('id', contractorIds)
      
      contractorMap = contractors?.reduce((acc: any, contractor: any) => {
        acc[contractor.id] = contractor
        return acc
      }, {}) || {}
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
      contractor_name: contractorMap[project.contractor_id]?.display_name || '未割当',
      contractor_email: contractorMap[project.contractor_id]?.email || '',
      progress: Math.floor(Math.random() * 100), // 実際の進捗計算ロジックに置き換え
      category: project.category || '道路設計',
      assignee_name: project.assignee_name,
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
