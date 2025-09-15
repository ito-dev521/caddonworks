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
      contractor_id,
      bid_amount,
      start_date,
      end_date,
      contract_content
    } = body

    // バリデーション
    if (!project_id || !contractor_id || !bid_amount || !start_date || !end_date || !contract_content) {
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
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 発注者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    const orgMembership = memberships.find(m => m.role === 'OrgAdmin')
    if (!orgMembership) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（発注者権限が必要です）' },
        { status: 403 }
      )
    }

    // 案件情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id')
      .eq('id', project_id)
      .eq('org_id', orgMembership.org_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // 受注者情報を取得
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('id', contractor_id)
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json(
        { message: '受注者情報が見つかりません' },
        { status: 404 }
      )
    }

    // 契約データを作成
    const { data: contractData, error: contractError } = await supabaseAdmin
      .from('contracts')
      .insert({
        project_id,
        contractor_id,
        org_id: orgMembership.org_id,
        contract_title: `${project.title} - 電子契約書`,
        contract_content,
        bid_amount: Number(bid_amount),
        start_date,
        end_date,
        status: 'pending_contractor'
      })
      .select()
      .single()

    if (contractError) {
      console.error('契約作成エラー:', contractError)
      return NextResponse.json(
        { message: '契約の作成に失敗しました: ' + contractError.message },
        { status: 400 }
      )
    }

    // 受注者に通知を送信
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: contractor_id,
        type: 'contract_created',
        title: '新しい契約書が作成されました',
        message: `案件「${project.title}」の契約書が作成されました。内容をご確認ください。`,
        data: {
          contract_id: contractData.id,
          project_id,
          project_title: project.title,
          org_name: userProfile.display_name,
          bid_amount: Number(bid_amount)
        }
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
    }

    return NextResponse.json({
      message: '契約書が正常に作成されました',
      contract: contractData
    }, { status: 201 })

  } catch (error) {
    console.error('契約作成エラー:', error)
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
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // ユーザーの契約を取得
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        project_id,
        contractor_id,
        org_id,
        contract_title,
        contract_content,
        bid_amount,
        start_date,
        end_date,
        status,
        contractor_signed_at,
        org_signed_at,
        signed_at,
        created_at,
        projects!contracts_project_id_fkey (
          title
        ),
        users!contracts_contractor_id_fkey (
          display_name,
          email
        ),
        organizations!contracts_org_id_fkey (
          name
        )
      `)
      .or(`contractor_id.eq.${userProfile.id},org_id.in.(${userProfile.id})`)
      .order('created_at', { ascending: false })

    if (contractsError) {
      console.error('契約取得エラー:', contractsError)
      return NextResponse.json(
        { message: '契約の取得に失敗しました' },
        { status: 400 }
      )
    }

    const formattedContracts = contracts?.map(contract => ({
      id: contract.id,
      project_id: contract.project_id,
      contractor_id: contract.contractor_id,
      org_id: contract.org_id,
      contract_title: contract.contract_title,
      contract_content: contract.contract_content,
      bid_amount: contract.bid_amount,
      start_date: contract.start_date,
      end_date: contract.end_date,
      status: contract.status,
      contractor_signed_at: contract.contractor_signed_at,
      org_signed_at: contract.org_signed_at,
      signed_at: contract.signed_at,
      created_at: contract.created_at,
      project_title: (contract.projects as any)?.title,
      contractor_name: (contract.users as any)?.display_name,
      contractor_email: (contract.users as any)?.email,
      org_name: (contract.organizations as any)?.name
    })) || []

    return NextResponse.json({
      contracts: formattedContracts
    }, { status: 200 })

  } catch (error) {
    console.error('契約取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
