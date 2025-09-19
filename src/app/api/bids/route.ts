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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      project_id,
      bid_amount,
      proposal,
      budget_approved
    } = body

    // バリデーション
    if (!project_id || !bid_amount) {
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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 受注者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    const isContractor = memberships.some(m => m.role === 'Contractor')
    if (!isContractor) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（受注者権限が必要です）' },
        { status: 403 }
      )
    }

    // 案件が存在し、入札可能な状態かチェック
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, status, bidding_deadline, required_contractors')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    if (project.status !== 'bidding') {
      return NextResponse.json(
        { message: 'この案件は入札受付期間ではありません' },
        { status: 400 }
      )
    }

    // 入札締切チェック
    if (project.bidding_deadline) {
      const deadline = new Date(project.bidding_deadline)
      const now = new Date()
      if (now > deadline) {
        return NextResponse.json(
          { message: '入札締切を過ぎています' },
          { status: 400 }
        )
      }
    }

    // 既に入札済みかチェック（現在の入札）
    const { data: existingBid, error: bidCheckError } = await supabaseAdmin
      .from('bids')
      .select('id')
      .eq('project_id', project_id)
      .eq('contractor_id', userProfile.id)
      .single()

    if (existingBid) {
      return NextResponse.json(
        { message: '既にこの案件に入札済みです' },
        { status: 400 }
      )
    }

    // 過去にこの案件で契約辞退したことがあるかチェック
    const { data: declinedContract, error: declinedCheckError } = await supabaseAdmin
      .from('contracts')
      .select('id')
      .eq('project_id', project_id)
      .eq('contractor_id', userProfile.id)
      .eq('status', 'declined')
      .single()

    if (declinedContract) {
      return NextResponse.json(
        { message: 'この案件で過去に契約を辞退しているため、再度入札することはできません' },
        { status: 400 }
      )
    }

    // 募集人数チェック（承認済み入札数が募集人数に達していないかチェック）
    const { data: approvedBids, error: approvedBidsError } = await supabaseAdmin
      .from('bids')
      .select('id')
      .eq('project_id', project_id)
      .eq('status', 'approved')

    if (approvedBidsError) {
      console.error('承認済み入札数取得エラー:', approvedBidsError)
    }

    const requiredContractors = project.required_contractors || 1
    const approvedCount = approvedBids?.length || 0

    if (approvedCount >= requiredContractors) {
      return NextResponse.json(
        { message: `この案件の募集は終了しています（募集人数: ${requiredContractors}名、承認済み: ${approvedCount}名）` },
        { status: 400 }
      )
    }

    // 入札データを挿入
    const { data: bidData, error: bidError } = await supabaseAdmin
      .from('bids')
      .insert({
        project_id,
        contractor_id: userProfile.id,
        bid_amount: Number(bid_amount),
        proposal: proposal || '',
        budget_approved: true, // デフォルトでtrueに設定（後方互換性のため）
        estimated_duration: null, // 古いフィールドはnullに設定
        start_date: null, // 古いフィールドはnullに設定
        status: 'submitted'
      })
      .select()
      .single()

    if (bidError) {
      console.error('入札作成エラー:', bidError)
      
      // データベース制約エラーの特別な処理
      if (bidError.message.includes('estimated_duration') || bidError.message.includes('start_date')) {
        return NextResponse.json(
          { 
            message: 'データベーススキーマが古いです。bidsテーブルの制約を修正してください。',
            error: bidError.message,
            suggestion: 'SupabaseのSQLエディタでfix-bids-table-constraints.sqlを実行してください。'
          },
          { status: 500 }
        )
      }
      
      return NextResponse.json(
        { message: '入札の作成に失敗しました: ' + bidError.message },
        { status: 400 }
      )
    }

    // 案件情報を取得（通知用）
    const { data: projectInfo, error: projectInfoError } = await supabaseAdmin
      .from('projects')
      .select('title, org_id')
      .eq('id', project_id)
      .single()

    if (projectInfoError) {
      console.error('案件情報取得エラー:', projectInfoError)
    } else {
      // 組織情報を別途取得
      const { data: organization, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('name')
        .eq('id', projectInfo.org_id)
        .single()

      if (orgError) {
        console.error('組織情報取得エラー:', orgError)
      }

      const projectInfoWithOrg = {
        ...projectInfo,
        organizations: organization
      }

      // 発注者に通知を送信

      const { data: orgAdmins, error: orgAdminsError } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('org_id', projectInfoWithOrg.org_id)
        .eq('role', 'OrgAdmin')

      if (orgAdminsError) {
        console.error('発注者取得エラー:', {
          error: orgAdminsError,
          org_id: projectInfoWithOrg.org_id
        })
          } else {
        // 各発注者に通知を作成
        const notifications = orgAdmins.map(admin => ({
          user_id: admin.user_id,
          type: 'bid_received',
          title: '新しい入札が届きました',
          message: `案件「${projectInfoWithOrg.title}」に新しい入札が届きました。入札金額: ¥${Number(bid_amount).toLocaleString()}`,
          data: {
            project_id,
            bid_id: bidData.id,
            contractor_id: userProfile.id,
            contractor_name: userProfile.display_name,
            bid_amount: Number(bid_amount),
            project_title: projectInfoWithOrg.title,
            org_name: (projectInfoWithOrg.organizations as any)?.name
          }
        }))

        const { data: insertedNotifications, error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert(notifications)
          .select()

        if (notificationError) {
          console.error('通知作成エラー:', {
            error: notificationError,
            notifications: notifications,
            projectInfo: projectInfoWithOrg
          })
          // 通知作成に失敗しても入札は成功とする
            } else {
        }
      }
    }

    return NextResponse.json({
      message: '入札が正常に送信されました',
      bid: bidData
    }, { status: 201 })

  } catch (error) {
    console.error('入札作成エラー:', error)
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
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 受注者の入札履歴を取得
    const { data: bidsData, error: bidsError } = await supabaseAdmin
      .from('bids')
      .select(`
        id,
        project_id,
        bid_amount,
        proposal,
        estimated_duration,
        start_date,
        status,
        created_at,
        projects!bids_project_id_fkey (
          title,
          status,
          organizations!projects_org_id_fkey (
            name
          )
        )
      `)
      .eq('contractor_id', userProfile.id)
      .order('created_at', { ascending: false })

    if (bidsError) {
      console.error('入札履歴の取得に失敗:', bidsError)
      return NextResponse.json(
        { message: '入札履歴の取得に失敗しました' },
        { status: 400 }
      )
    }

    const formattedBids = bidsData?.map(bid => ({
      id: bid.id,
      project_id: bid.project_id,
      bid_amount: bid.bid_amount,
      proposal: bid.proposal,
      message: bid.proposal, // proposalフィールドをmessageとして使用
      estimated_duration: bid.estimated_duration,
      start_date: bid.start_date,
      status: bid.status,
      created_at: bid.created_at,
      project_title: (bid.projects as any)?.title,
      project_status: (bid.projects as any)?.status,
      org_name: (bid.projects as any)?.organizations?.name
    })) || []

    return NextResponse.json({
      bids: formattedBids
    }, { status: 200 })

  } catch (error) {
    console.error('入札履歴取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
