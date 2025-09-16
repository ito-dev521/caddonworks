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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bidId = params.id

    if (!bidId) {
      return NextResponse.json({ message: '入札IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 入札情報を取得
    const { data: bid, error: bidError } = await supabaseAdmin
      .from('bids')
      .select('*')
      .eq('id', bidId)
      .single()

    if (bidError || !bid) {
      return NextResponse.json({ message: '入札が見つかりません' }, { status: 404 })
    }

    // 案件情報を別途取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', bid.project_id)
      .single()

    if (projectError) {
      console.error('案件情報取得エラー:', projectError)
    }

    // 組織情報を別途取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', project?.org_id)
      .single()

    if (orgError) {
      console.error('組織情報取得エラー:', orgError)
    }

    // 受注者情報を別途取得
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('display_name, email')
      .eq('id', bid.contractor_id)
      .single()

    if (contractorError) {
      console.error('受注者情報取得エラー:', contractorError)
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック
    const isOrgAdmin = membership.role === 'OrgAdmin' && project?.org_id === membership.org_id
    const isContractor = membership.role === 'Contractor' && bid.contractor_id === userProfile.id

    if (!isOrgAdmin && !isContractor) {
      return NextResponse.json({ message: 'この入札を閲覧する権限がありません' }, { status: 403 })
    }

    // レスポンス用のデータを整形
    const formattedBid = {
      id: bid.id,
      project_id: bid.project_id,
      contractor_id: bid.contractor_id,
      bid_amount: bid.bid_amount,
      message: bid.message,
      created_at: bid.created_at,
      contractor_name: contractor?.display_name,
      contractor_email: contractor?.email,
      project_title: project?.title,
      project_description: project?.description,
      project_budget: project?.budget,
      project_start_date: project?.start_date,
      project_end_date: project?.end_date,
      project_category: project?.category,
      project_org_id: project?.org_id,
      project_org_name: organization?.name
    }

    return NextResponse.json({ bid: formattedBid }, { status: 200 })

  } catch (error) {
    console.error('入札取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
