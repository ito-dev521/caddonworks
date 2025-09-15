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
      bid_id,
      contract_amount,
      start_date,
      end_date,
      contractor_id,
      org_id
    } = body

    if (!project_id || !bid_id || !contract_amount || !start_date || !end_date || !contractor_id || !org_id) {
      return NextResponse.json({ message: '必須項目が入力されていません' }, { status: 400 })
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
        org_id: orgMembership.org_id,
        contractor_id,
        bid_id,
        contract_amount: Number(contract_amount),
        start_date,
        end_date,
        status: 'pending'
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

    // 案件のステータスを更新
    await supabaseAdmin
      .from('projects')
      .update({ status: 'contract_pending', contractor_id: contractor_id })
      .eq('id', project_id)

    // 受注者に契約書作成通知を送信
    const { data: contractorUser, error: contractorUserError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('id', contractor_id)
      .single()

    if (!contractorUserError && contractorUser) {
      await supabaseAdmin.from('notifications').insert({
        user_id: contractorUser.id,
        type: 'contract_created',
        title: '新しい契約書が作成されました',
        message: `案件「${project.title}」の契約書が作成されました。内容を確認し、署名してください。`,
        data: {
          project_id,
          contract_id: contractData.id,
          org_id: orgMembership.org_id,
          org_name: (await supabaseAdmin.from('organizations').select('name').eq('id', orgMembership.org_id).single()).data?.name
        }
      })
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
    console.log('contracts API: リクエスト開始')
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('contracts API: 認証ヘッダーなし')
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('contracts API: トークン取得', { tokenLength: token.length })
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('contracts API: 認証エラー', { authError: authError?.message, hasUser: !!user })
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    console.log('contracts API: 認証成功', { userId: user.id })

    // ユーザープロフィールを取得
    console.log('contracts API: ユーザープロフィール取得開始')
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('contracts API: ユーザープロフィール取得エラー', { userError: userError?.message, hasProfile: !!userProfile })
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    console.log('contracts API: ユーザープロフィール取得成功', { profileId: userProfile.id })

    // ユーザーのロールと組織IDを取得
    console.log('contracts API: メンバーシップ取得開始')
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      console.error('contracts API: メンバーシップ取得エラー', { membershipError: membershipError?.message, membershipsCount: memberships?.length })
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    console.log('contracts API: メンバーシップ取得成功', { membershipsCount: memberships.length })

    let contractsData: any[] | null = []
    let contractsError: any = null

    // OrgAdminの場合、自分の組織の契約を取得
    const orgAdminMembership = memberships.find(m => m.role === 'OrgAdmin')
    if (orgAdminMembership) {
      console.log('contracts API: OrgAdminとして契約取得開始', { orgId: orgAdminMembership.org_id })
      
      // まず基本的な契約データを取得
      const { data: contractsBasic, error: contractsBasicError } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('org_id', orgAdminMembership.org_id)
        .order('created_at', { ascending: false })
      
      if (contractsBasicError) {
        console.error('contracts API: 基本契約データ取得エラー', contractsBasicError)
        contractsData = []
        contractsError = contractsBasicError
      } else {
        console.log('contracts API: 基本契約データ取得成功', { contractsCount: contractsBasic?.length })
        
        // 関連データを個別に取得
        const projectIds = [...new Set(contractsBasic?.map(c => c.project_id) || [])]
        const contractorIds = [...new Set(contractsBasic?.map(c => c.contractor_id) || [])]
        
        // 案件情報を取得
        let projectMap: any = {}
        if (projectIds.length > 0) {
          const { data: projects } = await supabaseAdmin
            .from('projects')
            .select('id, title')
            .in('id', projectIds)
          
          projectMap = projects?.reduce((acc: any, project: any) => {
            acc[project.id] = project
            return acc
          }, {}) || {}
        }
        
        // 組織情報を取得
        const { data: orgData } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .eq('id', orgAdminMembership.org_id)
          .single()
        
        // 受注者情報を取得
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
        
        // データを結合
        contractsData = contractsBasic?.map(contract => ({
          ...contract,
          projects: projectMap[contract.project_id],
          organizations: orgData,
          contractors: contractorMap[contract.contractor_id]
        })) || []
        
        contractsError = null
      }
      
      console.log('contracts API: OrgAdmin契約取得結果', { contractsCount: contractsData?.length, error: contractsError?.message })
    } 
    // Contractorの場合、自分が関わる契約を取得
    else if (memberships.some(m => m.role === 'Contractor')) {
      console.log('contracts API: Contractorとして契約取得開始', { contractorId: userProfile.id })
      
      // まず基本的な契約データを取得
      const { data: contractsBasic, error: contractsBasicError } = await supabaseAdmin
        .from('contracts')
        .select('*')
        .eq('contractor_id', userProfile.id)
        .order('created_at', { ascending: false })
      
      if (contractsBasicError) {
        console.error('contracts API: 基本契約データ取得エラー', contractsBasicError)
        contractsData = []
        contractsError = contractsBasicError
      } else {
        console.log('contracts API: 基本契約データ取得成功', { contractsCount: contractsBasic?.length })
        
        // 関連データを個別に取得
        const projectIds = [...new Set(contractsBasic?.map(c => c.project_id) || [])]
        const orgIds = [...new Set(contractsBasic?.map(c => c.org_id) || [])]
        
        // 案件情報を取得
        let projectMap: any = {}
        if (projectIds.length > 0) {
          const { data: projects } = await supabaseAdmin
            .from('projects')
            .select('id, title')
            .in('id', projectIds)
          
          projectMap = projects?.reduce((acc: any, project: any) => {
            acc[project.id] = project
            return acc
          }, {}) || {}
        }
        
        // 組織情報を取得
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
        
        // 受注者情報を取得
        const { data: contractorData } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .eq('id', userProfile.id)
          .single()
        
        // データを結合
        contractsData = contractsBasic?.map(contract => ({
          ...contract,
          projects: projectMap[contract.project_id],
          organizations: orgMap[contract.org_id],
          contractors: contractorData
        })) || []
        
        contractsError = null
      }
      
      console.log('contracts API: Contractor契約取得結果', { contractsCount: contractsData?.length, error: contractsError?.message })
    } else {
      console.log('contracts API: 権限なし')
      return NextResponse.json({ message: 'この操作を実行する権限がありません' }, { status: 403 })
    }

    if (contractsError) {
      console.error('契約取得エラー:', contractsError)
      return NextResponse.json({ message: '契約の取得に失敗しました' }, { status: 500 })
    }

    const formattedContracts = contractsData?.map(contract => ({
      ...contract,
      project_title: contract.projects?.title,
      org_name: contract.organizations?.name,
      contractor_name: contract.contractors?.display_name,
      contractor_email: contract.contractors?.email,
    })) || []

    console.log('contracts API: レスポンス準備完了', { contractsCount: formattedContracts.length })

    return NextResponse.json({ contracts: formattedContracts }, { status: 200 })

  } catch (error) {
    console.error('contracts API: サーバーエラー:', error)
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
