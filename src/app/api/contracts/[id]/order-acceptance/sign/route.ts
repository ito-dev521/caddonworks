import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    console.log('📝 注文請書電子署名開始:', contractId)

    // 認証チェック
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
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        contractor_id,
        order_acceptance_box_id,
        order_acceptance_number,
        order_acceptance_signed_at,
        projects!inner(
          id,
          title,
          created_by,
          organizations!inner(
            id,
            name,
            billing_email
          ),
          created_by_user:users!projects_created_by_fkey(
            id,
            name,
            email
          ),
          memberships!inner(
            user_id,
            role
          )
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // 注文請書が生成されているかチェック
    if (!contract.order_acceptance_box_id) {
      return NextResponse.json({ message: '注文請書が生成されていません' }, { status: 404 })
    }

    // 既に署名済みかチェック
    if (contract.order_acceptance_signed_at) {
      return NextResponse.json({
        message: '注文請書は既に署名済みです',
        signed_at: contract.order_acceptance_signed_at
      }, { status: 409 })
    }

    const project = contract.projects

    // 権限チェック：発注者のみが署名を開始可能
    const isProjectCreator = project.created_by_user?.id === userProfile.id
    const isOrgMember = project.memberships?.some(
      (m: any) => m.user_id === userProfile.id && ['OrgAdmin', 'Staff'].includes(m.role)
    )

    if (!isProjectCreator && !isOrgMember) {
      return NextResponse.json({ message: '注文請書の署名を開始する権限がありません' }, { status: 403 })
    }

    // 受注者情報を取得
    const { data: contractorProfile, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('id', contract.contractor_id)
      .single()

    if (contractorError || !contractorProfile) {
      return NextResponse.json({ message: '受注者情報が見つかりません' }, { status: 404 })
    }

    // Box Sign署名リクエストを作成（受注者のみ署名）
    const signers = [
      {
        email: contractorProfile.email,
        role: 'contractor' as const,
        name: contractorProfile.display_name,
        order: 1
      }
    ]

    const signatureRequest = await boxSignAPI.createSignatureRequest({
      documentName: `注文請書_${project.title}_${contract.order_acceptance_number}`,
      boxFileId: contract.order_acceptance_box_id,
      signers,
      message: `プロジェクト「${project.title}」の注文請書の署名をお願いいたします。`,
      daysUntilExpiration: 30,
      isDocumentPreparationNeeded: true
    })

    if (!signatureRequest.success) {
      console.error('❌ Box Sign署名リクエスト作成エラー:', signatureRequest.error)
      return NextResponse.json({
        message: '署名リクエストの作成に失敗しました',
        error: signatureRequest.error
      }, { status: 500 })
    }

    // 契約にBox Signリクエスト情報を記録
    const { error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        order_acceptance_sign_request_id: signatureRequest.signRequestId,
        order_acceptance_sign_started_at: new Date().toISOString()
      })
      .eq('id', contractId)

    if (updateError) {
      console.error('契約更新エラー:', updateError)
      return NextResponse.json({ message: '契約の更新に失敗しました' }, { status: 500 })
    }

    // 受注者に通知
    const notification = {
      user_id: contract.contractor_id,
      type: 'order_acceptance_signature_request',
      title: '注文請書への署名が必要です',
      message: `プロジェクト「${project.title}」の注文請書への署名をお願いいたします。`,
      data: {
        project_id: project.id,
        contract_id: contractId,
        sign_request_id: signatureRequest.signRequestId,
        signing_url: signatureRequest.signingUrls?.[0]?.url
      }
    }

    await supabaseAdmin
      .from('notifications')
      .insert([notification])

    console.log('✅ 注文請書署名リクエスト作成完了:', signatureRequest.signRequestId)

    return NextResponse.json({
      message: '注文請書の署名リクエストを作成しました',
      signRequestId: signatureRequest.signRequestId,
      prepareUrl: signatureRequest.prepareUrl,
      signingUrls: signatureRequest.signingUrls
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ 注文請書署名リクエスト作成エラー:', error)
    return NextResponse.json({
      message: '注文請書の署名リクエスト作成に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

// 注文請書署名のステータスを取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        order_acceptance_sign_request_id,
        order_acceptance_sign_started_at,
        order_acceptance_signed_at,
        projects!inner(
          id,
          title
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    let signatureStatus = null

    // Box Signリクエストが存在する場合、ステータスを取得
    if (contract.order_acceptance_sign_request_id) {
      try {
        signatureStatus = await boxSignAPI.getSignatureStatus(contract.order_acceptance_sign_request_id)
      } catch (error) {
        console.warn('Box Signステータス取得エラー:', error)
      }
    }

    return NextResponse.json({
      hasSignatureRequest: !!contract.order_acceptance_sign_request_id,
      signatureInfo: contract.order_acceptance_sign_request_id ? {
        signRequestId: contract.order_acceptance_sign_request_id,
        startedAt: contract.order_acceptance_sign_started_at,
        completedAt: contract.order_acceptance_signed_at,
        projectTitle: contract.projects.title,
        status: signatureStatus
      } : null
    })

  } catch (error: any) {
    console.error('❌ 注文請書署名ステータス取得エラー:', error)
    return NextResponse.json({
      message: '注文請書署名ステータスの取得に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}