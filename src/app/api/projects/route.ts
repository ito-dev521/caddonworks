import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service roleキーでSupabaseクライアントを作成（RLSをバイパス）

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
      required_level = 'beginner',
      approver_id
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
    
    // まず、usersテーブルでユーザーが存在するか確認
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()


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
          name,
          approval_required
        )
      `)
      .eq('user_id', userProfile.id)


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
    const approvalRequired = company.approval_required

    // 承認が必要でapprover_idが指定されていない場合のバリデーション
    if (approvalRequired && !approver_id) {
      return NextResponse.json(
        { message: '承認が必要な組織では承認者を選択してください' },
        { status: 400 }
      )
    }

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
      approver_id: approver_id || null,
      status: approvalRequired ? 'pending_approval' : 'bidding' // 承認が必要な場合は承認待ち
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

    // 承認が必要な場合、承認者に通知を送信
    if (approvalRequired && approver_id) {
      try {
        // 承認者のメンバーシップを取得
        const { data: approverMembership, error: approverMembershipError } = await supabaseAdmin
          .from('memberships')
          .select('user_id')
          .eq('user_id', approver_id)
          .eq('org_id', company.id)
          .single()

        if (approverMembership && !approverMembershipError) {
          // 承認通知を作成
          const { error: notificationError } = await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: approver_id,
              type: 'project_approval_requested',
              title: '案件承認依頼',
              message: `案件「${title}」の承認をお願いします。`,
              data: {
                project_id: projectData.id,
                project_title: title,
                requester_id: userProfile.id,
                requester_name: userProfile.display_name
              }
            })

          if (notificationError) {
            console.error('承認通知の送信に失敗:', notificationError)
          }
        }
      } catch (notificationError) {
        console.error('承認通知処理エラー:', notificationError)
        // 通知エラーは案件作成を妨げない
      }
    }

    return NextResponse.json({
      message: approvalRequired ? '案件が作成されました。承認待ちです。' : '案件が正常に作成されました',
      project: projectData,
      requires_approval: approvalRequired
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
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('projects API: 認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました: ' + (authError?.message || 'ユーザーが見つかりません') },
        { status: 401 }
      )
    }


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
      return NextResponse.json({ projects: [] }, { status: 200 })
    }

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json({ projects: [] }, { status: 200 })
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
        created_at,
        bidding_deadline,
        required_contractors
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

    // 契約情報を取得（複数受注者対応）
    const projectIds = projectsData?.map(p => p.id) || []
    let contractMap: any = {}
    
    if (projectIds.length > 0) {
      const { data: contracts } = await supabaseAdmin
        .from('contracts')
        .select(`
          project_id,
          contractor_id,
          bid_amount,
          status
        `)
        .in('project_id', projectIds)
        .eq('status', 'signed') // 署名済み契約のみ
      
      // 受注者情報を取得
      const contractorIds = [...new Set(contracts?.map(c => c.contractor_id) || [])]
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
      
      // プロジェクトごとに契約をグループ化
      contractMap = contracts?.reduce((acc: any, contract: any) => {
        if (!acc[contract.project_id]) {
          acc[contract.project_id] = []
        }
        acc[contract.project_id].push({
          contractor_id: contract.contractor_id,
          contract_amount: contract.bid_amount,
          contractor_name: contractorMap[contract.contractor_id]?.display_name || '不明な受注者',
          contractor_email: contractorMap[contract.contractor_id]?.email || ''
        })
        return acc
      }, {}) || {}
      
    }

    const formattedProjects = projectsData?.map(project => {
      // 期限切れチェック（その日の終わり23:59:59まで有効）
      const now = new Date()
      const deadline = project.bidding_deadline ? new Date(project.bidding_deadline) : null
      let isExpired = false
      if (deadline && project.status === 'bidding') {
        // 締切日の23:59:59まで有効にする
        const endOfDeadlineDay = new Date(deadline)
        endOfDeadlineDay.setHours(23, 59, 59, 999)
        isExpired = now > endOfDeadlineDay
      }
      
      // 期限までの日数を計算（その日の終わりまで考慮）
      let daysUntilDeadline = null
      if (deadline) {
        const endOfDeadlineDay = new Date(deadline)
        endOfDeadlineDay.setHours(23, 59, 59, 999)
        daysUntilDeadline = Math.ceil((endOfDeadlineDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }

      const result = {
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
        created_at: project.created_at,
        bidding_deadline: project.bidding_deadline,
        required_contractors: project.required_contractors || 1,
        is_expired: isExpired,
        days_until_deadline: daysUntilDeadline,
        contracts: contractMap[project.id] || [] // 複数受注者の契約情報
      }
      
      
      return result
    }) || []

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
