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

export async function POST(
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
      .select('id, display_name')
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
        { message: '組織情報が見つかりません' },
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

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('contractor_id', userProfile.id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    if (contract.status !== 'pending_contractor') {
      return NextResponse.json(
        { message: 'この契約は既に署名済みです' },
        { status: 400 }
      )
    }

    // 契約に署名
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        status: 'signed',
        contractor_signed_at: new Date().toISOString(),
        signed_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      console.error('契約署名エラー:', updateError)
      return NextResponse.json(
        { message: '署名に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    // 案件のステータスとcontractor_idを更新
    await supabaseAdmin
      .from('projects')
      .update({ 
        status: 'in_progress',
        contractor_id: userProfile.id
      })
      .eq('id', contract.project_id)

    // 発注者に署名完了通知を送信
    const { data: orgAdmins, error: orgAdminsError } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('org_id', contract.org_id)
      .eq('role', 'OrgAdmin')

    if (!orgAdminsError && orgAdmins && orgAdmins.length > 0) {
      // 案件情報を取得
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('title')
        .eq('id', contract.project_id)
        .single()

      if (!projectError && project) {
        const notifications = orgAdmins.map(admin => ({
          user_id: admin.user_id,
          type: 'contract_signed',
          title: '契約が署名されました',
          message: `案件「${project.title}」の契約が受注者によって署名されました。チャットルームでやりとりを開始できます。`,
          data: {
            project_id: contract.project_id,
            contract_id: contractId,
            contractor_id: userProfile.id,
            contractor_name: userProfile.display_name
          }
        }))

        await supabaseAdmin
          .from('notifications')
          .insert(notifications)
      }
    }

    return NextResponse.json({
      message: '契約に署名しました',
      contract: updatedContract
    }, { status: 200 })

  } catch (error) {
    console.error('契約署名エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}