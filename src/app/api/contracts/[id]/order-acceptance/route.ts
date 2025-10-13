import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { documentGenerator, createOrderAcceptanceDocumentData } from '@/lib/document-generator'
import { uploadFileToBox, createBoxSharedLink } from '@/lib/box'

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

    // リクエストボディはオプション（空の場合は自動生成される）
    let orderNumber: string | undefined
    let orderDate: string | undefined

    try {
      const body = await request.json()
      orderNumber = body.orderNumber
      orderDate = body.orderDate
    } catch (e) {
      // リクエストボディが空の場合は自動生成される
    }

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
      .select('id, display_name, formal_name, email, address, postal_code, phone_number')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 契約情報とプロジェクト情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        *,
        projects(
          id,
          title,
          location,
          start_date,
          end_date,
          created_by,
          org_id,
          box_folder_id,
          organizations(
            id,
            name,
            billing_email
          ),
          created_by_user:users!projects_created_by_fkey(
            id,
            display_name,
            email
          )
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      console.error('契約取得エラー:', contractError)
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    const project = contract.projects

    if (!project) {
      console.error('プロジェクト情報が見つかりません:', contractId)
      return NextResponse.json({ message: 'プロジェクト情報が見つかりません' }, { status: 404 })
    }

    if (!project.organizations) {
      console.error('組織情報が見つかりません:', project.id)
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック：発注者（プロジェクト作成者または組織メンバー）のみが注文請書を作成可能
    const isProjectCreator = project.created_by_user?.id === userProfile.id

    // 組織メンバーシップを別途クエリ
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('user_id, role')
      .eq('org_id', project.org_id)
      .eq('user_id', userProfile.id)
      .in('role', ['OrgAdmin', 'Staff'])

    const isOrgMember = memberships && memberships.length > 0

    if (!isProjectCreator && !isOrgMember) {
      return NextResponse.json({ message: 'この契約の注文請書を作成する権限がありません' }, { status: 403 })
    }

    // 既に注文請書が作成されている場合はエラー
    if (contract.order_acceptance_generated_at) {
      return NextResponse.json({
        message: 'この契約の注文請書は既に作成されています',
        generated_at: contract.order_acceptance_generated_at
      }, { status: 409 })
    }

    // 受注者情報を取得
    const { data: contractorProfile, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, formal_name, email, address, postal_code, phone_number')
      .eq('id', contract.contractor_id)
      .single()

    if (contractorError || !contractorProfile) {
      return NextResponse.json({ message: '受注者情報が見つかりません' }, { status: 404 })
    }

    // 発注者（クライアント）情報
    const client = {
      name: project.organizations.name,
      email: project.organizations.billing_email || project.created_by_user?.email
    }

    // システム設定（サポート手数料％）を取得
    const { data: sysSettings } = await supabaseAdmin
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()
    const supportFeePercent = Number(sysSettings?.support_fee_percent ?? 8)

    // 注文請書データを準備（受注者情報を使用）
    const orderAcceptanceData = createOrderAcceptanceDocumentData(
      {
        title: project.title,
        amount: contract.bid_amount,
        deadline: contract.end_date || project.end_date,
        start_date: contract.start_date || project.start_date,
        location: project.location
      },
      {
        name: contractorProfile.formal_name || contractorProfile.display_name,
        email: contractorProfile.email,
        address: contractorProfile.address,
        postal_code: contractorProfile.postal_code,
        phone_number: contractorProfile.phone_number
      },
      {
        name: project.organizations.name,
        email: project.organizations.billing_email || project.created_by_user?.email,
        address: project.organizations.address || '福岡県福岡市早良区西新1丁目10-13',
        building: project.organizations.building || '西新新田ビル403',
        representative: project.organizations.representative || '代表取締役　井上直樹'
      },
      {
        orderNumber: orderNumber || `ORD-${contractId.slice(0, 8)}`,
        orderDate: orderDate || contract.created_at?.split('T')[0],
        supportEnabled: contract.support_enabled || false,
        supportFeePercent: supportFeePercent
      }
    )

    // PDFを生成
    const pdfBuffer = await documentGenerator.generateDocument('order_acceptance', orderAcceptanceData)

    // Boxにアップロード
    const fileName = `注文請書_${project.title}_${contractorProfile.formal_name || contractorProfile.display_name}_${new Date().toISOString().split('T')[0]}.pdf`

    // プロジェクトフォルダの04_契約データフォルダを取得
    let uploadFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'

    if (project.box_folder_id) {
      try {
        const { getBoxFolderItems } = await import('@/lib/box')
        const projectItems = await getBoxFolderItems(project.box_folder_id)

        const contractFolder = projectItems.find(item =>
          item.type === 'folder' &&
          (item.name.includes('04_契約') || item.name.includes('契約'))
        )

        if (contractFolder) {
          uploadFolderId = contractFolder.id
        }
      } catch (error) {
        console.warn('契約フォルダの取得に失敗しました、ルートフォルダを使用します:', error)
      }
    }

    const boxFileId = await uploadFileToBox(
      pdfBuffer as unknown as ArrayBuffer,
      fileName,
      uploadFolderId
    )

    // Box共有リンクを作成
    const sharedLink = await createBoxSharedLink(boxFileId)

    // 契約に注文請書情報を記録
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        order_acceptance_generated_at: new Date().toISOString(),
        order_acceptance_box_id: boxFileId,
        order_acceptance_number: orderNumber || `ORD-${contractId.slice(0, 8)}`,
        order_acceptance_shared_link: sharedLink
      })
      .eq('id', contractId)
      .select(`
        *,
        projects!inner(id, title)
      `)
      .single()

    if (updateError) {
      console.error('契約更新エラー:', updateError)
      return NextResponse.json({ message: '契約の更新に失敗しました' }, { status: 500 })
    }

    // 受注者に通知
    await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: contract.contractor_id,
        type: 'order_acceptance_created',
        title: '注文請書が作成されました',
        message: `プロジェクト「${project.title}」の注文請書が発注者により作成されました。`,
        data: {
          project_id: project.id,
          contract_id: contractId,
          order_acceptance_box_id: boxFileId,
          creator_id: userProfile.id,
          creator_name: userProfile.display_name
        }
      })

    return NextResponse.json({
      message: '注文請書を生成しました',
      contract: updatedContract,
      fileName,
      boxFileId,
      orderAcceptanceNumber: orderNumber || `ORD-${contractId.slice(0, 8)}`,
      sharedLink
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ 注文請書生成エラー:', error)
    return NextResponse.json({
      message: '注文請書の生成に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

// 注文請書の情報を取得
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
        order_acceptance_generated_at,
        order_acceptance_box_id,
        order_acceptance_number,
        order_acceptance_shared_link,
        contractor_id,
        projects!inner(
          id,
          title,
          organizations!inner(id, name)
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({
      hasOrderAcceptance: !!contract.order_acceptance_generated_at,
      orderAcceptanceInfo: contract.order_acceptance_generated_at ? {
        generatedAt: contract.order_acceptance_generated_at,
        boxFileId: contract.order_acceptance_box_id,
        orderNumber: contract.order_acceptance_number,
        projectTitle: contract.projects.title,
        sharedLink: contract.order_acceptance_shared_link
      } : null
    })

  } catch (error: any) {
    console.error('❌ 注文請書情報取得エラー:', error)
    return NextResponse.json({
      message: '注文請書情報の取得に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}