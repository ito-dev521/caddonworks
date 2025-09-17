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
    const contractId = params.id

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

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーの権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報が見つかりません' },
        { status: 403 }
      )
    }

    const isOrgAdmin = memberships.some(m => m.role === 'OrgAdmin' && m.org_id === contract.org_id)
    const isContractor = memberships.some(m => m.role === 'Contractor') && contract.contractor_id === userProfile.id

    if (!isOrgAdmin && !isContractor) {
      return NextResponse.json(
        { message: 'この契約にアクセスする権限がありません' },
        { status: 403 }
      )
    }

    // 関連情報を取得
    const [projectResult, orgResult, contractorResult, orgAdminResult] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('id, title')
        .eq('id', contract.project_id)
        .single(),
      supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', contract.org_id)
        .single(),
      supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .eq('id', contract.contractor_id)
        .single(),
      supabaseAdmin
        .from('memberships')
        .select(`
          user_id,
          users!inner(id, display_name)
        `)
        .eq('org_id', contract.org_id)
        .eq('role', 'OrgAdmin')
        .limit(1)
        .single()
    ])

    const contractWithDetails = {
      ...contract,
      project_title: projectResult.data?.title || contract.contract_title,
      org_name: orgResult.data?.name,
      org_admin_name: (orgAdminResult.data?.users as any)?.display_name || orgResult.data?.name,
      contractor_name: contractorResult.data?.display_name,
      contractor_email: contractorResult.data?.email
    }

    return NextResponse.json({
      contract: contractWithDetails
    }, { status: 200 })

  } catch (error) {
    console.error('契約詳細取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
