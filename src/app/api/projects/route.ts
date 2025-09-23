import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withOrganizationCheck } from '@/lib/api-organization-check'

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

async function handlePOST(request: NextRequest) {
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
      approver_ids,
      support_enabled
    } = body

    // バリデーション
    if (!title || !description || !budget || !start_date || !end_date || !bidding_deadline || !category) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // 日付の整合性チェック（入札締切 <= 開始日 <= 納期）
    try {
      const bd = new Date(bidding_deadline)
      const st = new Date(start_date)
      const ed = new Date(end_date)

      if (isNaN(bd.getTime()) || isNaN(st.getTime()) || isNaN(ed.getTime())) {
        return NextResponse.json(
          { message: '日付の形式が正しくありません' },
          { status: 400 }
        )
      }

      // 締切日はその日の終わりまで有効
      const bdEndOfDay = new Date(bd)
      bdEndOfDay.setHours(23, 59, 59, 999)

      if (st < bdEndOfDay) {
        return NextResponse.json(
          { message: '開始日は入札締切日以降の日付にしてください' },
          { status: 400 }
        )
      }

      if (ed < st) {
        return NextResponse.json(
          { message: '納期は開始日以降の日付にしてください' },
          { status: 400 }
        )
      }
    } catch (e) {
      return NextResponse.json(
        { message: '日付の検証中にエラーが発生しました' },
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

    // 承認が必要でapprover_idsが指定されていない場合のバリデーション
    if (approvalRequired && (!approver_ids || !Array.isArray(approver_ids) || approver_ids.length === 0)) {
      return NextResponse.json(
        { message: '承認が必要な組織では少なくとも1人の承認者を選択してください' },
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
      approver_ids: approver_ids || null,
      created_by: userProfile.id, // プロジェクト作成者を記録
      status: approvalRequired ? 'pending_approval' : 'bidding', // 承認が必要な場合は承認待ち
      support_enabled: !!support_enabled
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
    if (approvalRequired && approver_ids && Array.isArray(approver_ids)) {
      try {
        // 各承認者に個別に通知を送信
        for (const approverId of approver_ids) {
          // 承認者のメンバーシップを確認
          const { data: approverMembership, error: approverMembershipError } = await supabaseAdmin
            .from('memberships')
            .select('user_id')
            .eq('user_id', approverId)
            .eq('org_id', company.id)
            .single()

          if (approverMembership && !approverMembershipError) {
            // 承認通知を作成
            const { error: notificationError } = await supabaseAdmin
              .from('notifications')
              .insert({
                user_id: approverId,
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
      .select('*')
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
          status,
          support_enabled,
          created_at,
          updated_at
        `)
        .in('project_id', projectIds)
        .eq('status', 'signed') // 署名済み契約のみ
      
      // 受注者情報を取得
      const contractorIds = Array.from(new Set(contracts?.map(c => c.contractor_id) || []))
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
      
      // プロジェクトごとに契約をグループ化（受注者IDで重複排除。最新の契約のみ残す）
      contractMap = (contracts || []).reduce((acc: any, contract: any) => {
        if (!acc[contract.project_id]) {
          acc[contract.project_id] = new Map<string, any>()
        }
        const map: Map<string, any> = acc[contract.project_id]

        const existing = map.get(String(contract.contractor_id))
        const existingTime = existing ? new Date(existing.updated_at || existing.created_at).getTime() : -1
        const currentTime = new Date(contract.updated_at || contract.created_at).getTime()

        if (!existing || currentTime >= existingTime) {
          map.set(String(contract.contractor_id), {
            contractor_id: contract.contractor_id,
            contract_amount: contract.bid_amount,
            contractor_name: contractorMap[contract.contractor_id]?.display_name || '不明な受注者',
            contractor_email: contractorMap[contract.contractor_id]?.email || '',
            support_enabled: contract.support_enabled || false,
            created_at: contract.created_at,
            updated_at: contract.updated_at
          })
        }
        return acc
      }, {} as Record<string, Map<string, any>>)
      
      // Mapを配列に変換
      Object.keys(contractMap).forEach((projectId) => {
        const values = Array.from(contractMap[projectId].values())
        // 表示の安定化のため更新日時の降順で並べる
        values.sort((a: any, b: any) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
        contractMap[projectId] = values
      })
      
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
        support_enabled: project.support_enabled || false, // プロジェクトレベルのサポート
        contracts: contractMap[project.id] || [], // 複数受注者の契約情報
        approver_ids: project.approver_ids || null
      }
      
      
      return result
    }) || []

    // 承認待ちの案件は、承認者として選択されたユーザーのみに表示
    const filteredProjects = formattedProjects.filter(project => {
      // 承認待ち以外の案件は全て表示
      if (project.status !== 'pending_approval') {
        return true
      }

      // 承認待ちの案件は、approver_idsに現在のユーザーが含まれている場合のみ表示
      if (project.approver_ids && Array.isArray(project.approver_ids)) {
        return project.approver_ids.includes(userProfile.id)
      }

      // approver_idsが設定されていない場合は表示しない
      return false
    })

    return NextResponse.json({
      projects: filteredProjects
    }, { status: 200 })

  } catch (error) {
    console.error('案件取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 組織チェック付きのexport関数
export async function POST(request: NextRequest) {
  return withOrganizationCheck(request, handlePOST)
}
