import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'
import { getAppAuthAccessToken, deleteBoxFile } from '@/lib/box'

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
          box_folder_id,
          created_by,
          org_id,
          organizations!inner(
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

    // 組織メンバーシップを別途クエリ
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('user_id, role')
      .eq('org_id', project.org_id)
      .eq('user_id', userProfile.id)
      .in('role', ['OrgAdmin', 'Staff'])

    const isOrgMember = memberships && memberships.length > 0

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

    // プロジェクトの04_契約資料フォルダを取得
    let contractFolderId: string | undefined = undefined

    if (project.box_folder_id) {
      try {
        const accessToken = await getAppAuthAccessToken()

        // プロジェクトフォルダのアイテムを取得
        const response = await fetch(`https://api.box.com/2.0/folders/${project.box_folder_id}/items?limit=100`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        })

        if (response.ok) {
          const items = await response.json()
          const contractFolder = items.entries?.find((item: any) =>
            item.type === 'folder' &&
            (item.name.includes('04_契約') || item.name.includes('契約'))
          )

          if (contractFolder) {
            contractFolderId = contractFolder.id
            console.log('✅ 契約フォルダを発見、署名済みドキュメントをここに保存:', contractFolderId)
          } else {
            console.warn('⚠️ 契約フォルダが見つかりません、デフォルトフォルダを使用します')
          }
        }
      } catch (error) {
        console.error('❌ 契約フォルダの取得に失敗:', error)
      }
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
      isDocumentPreparationNeeded: false, // 自動配置を使用（prepare_urlは不要）
      parentFolderId: contractFolderId // 署名済みドキュメントを04_契約資料フォルダに直接保存
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

    // 元のPDFファイルを削除（署名前のファイルは不要）
    try {
      console.log('🗑️ 署名前の元PDFファイルを削除:', contract.order_acceptance_box_id)
      await deleteBoxFile(contract.order_acceptance_box_id)
      console.log('✅ 元PDFファイルを削除しました')
    } catch (deleteError) {
      // 削除に失敗してもエラーにはしない（署名リクエストは正常に作成されている）
      console.warn('⚠️ 元PDFファイルの削除に失敗しました（処理は続行）:', deleteError)
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
        contractor_id,
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

    // 受注者情報を取得
    let contractorInfo = null
    if (contract.contractor_id) {
      const { data: contractor } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .eq('id', contract.contractor_id)
        .single()

      if (contractor) {
        contractorInfo = {
          name: contractor.display_name,
          email: contractor.email
        }
      }
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
        contractor: contractorInfo,
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

// 注文請書署名リクエストを再送信
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    console.log('🔄 注文請書署名リクエスト再送信:', contractId)

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
        order_acceptance_sign_request_id,
        order_acceptance_sign_started_at,
        projects!inner(
          id,
          title,
          created_by,
          org_id,
          organizations!inner(
            id,
            name
          )
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    const project = contract.projects

    // 権限チェック：発注者のみが再送信可能
    const isProjectCreator = project.created_by === userProfile.id

    // 組織メンバーシップを別途クエリ
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('user_id, role')
      .eq('org_id', project.org_id)
      .eq('user_id', userProfile.id)
      .in('role', ['OrgAdmin', 'Staff'])

    const isOrgMember = memberships && memberships.length > 0

    if (!isProjectCreator && !isOrgMember) {
      return NextResponse.json({ message: '署名リクエストを再送信する権限がありません' }, { status: 403 })
    }

    // 署名リクエストIDが存在するかチェック
    if (!contract.order_acceptance_sign_request_id) {
      return NextResponse.json({ message: '署名リクエストが見つかりません' }, { status: 404 })
    }

    // Box Sign署名リクエストを再送信
    const success = await boxSignAPI.resendSignatureRequest(contract.order_acceptance_sign_request_id)

    if (!success) {
      return NextResponse.json({
        message: '署名リクエストの再送信に失敗しました'
      }, { status: 500 })
    }

    console.log('✅ 注文請書署名リクエスト再送信完了:', contract.order_acceptance_sign_request_id)

    return NextResponse.json({
      message: '注文請書の署名リクエストを再送信しました',
      signRequestId: contract.order_acceptance_sign_request_id
    })

  } catch (error: any) {
    console.error('❌ 注文請書署名リクエスト再送信エラー:', error)
    return NextResponse.json({
      message: '注文請書の署名リクエスト再送信に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}