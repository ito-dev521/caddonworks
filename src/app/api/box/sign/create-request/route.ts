export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI, createProjectSigners, createMonthlyInvoiceSigners } from '@/lib/box-sign'
import { documentGenerator, createOrderDocumentData, createCompletionDocumentData, createMonthlyInvoiceDocumentData } from '@/lib/document-generator'
import { uploadFileToBox } from '@/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const {
      type, // 'order', 'completion', 'monthly_invoice'
      projectId,
      contractId,
      monthlyInvoiceId,
      templateId,
      signers,
      message,
      daysUntilExpiration = 30
    } = await request.json()

    console.log('📝 Box Sign リクエスト作成開始:', { type, projectId, contractId, monthlyInvoiceId })

    // 1. テンプレートとデータの取得
    const { data: template } = await supabaseAdmin
      .from('document_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })
    }

    // 2. ドキュメントデータの準備
    let documentData
    let fileName
    let boxFileParentId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'

    switch (type) {
      case 'order':
        const orderResult = await prepareOrderDocument(projectId, contractId)
        if (!orderResult.success) {
          return NextResponse.json({ error: orderResult.error }, { status: 400 })
        }
        documentData = orderResult.documentData
        fileName = `発注書_${orderResult.projectTitle}_${new Date().toISOString().split('T')[0]}.pdf`
        boxFileParentId = orderResult.projectFolderId || boxFileParentId
        break

      case 'completion':
        const completionResult = await prepareCompletionDocument(projectId)
        if (!completionResult.success) {
          return NextResponse.json({ error: completionResult.error }, { status: 400 })
        }
        documentData = completionResult.documentData
        fileName = `完了届_${completionResult.projectTitle}_${new Date().toISOString().split('T')[0]}.pdf`
        boxFileParentId = completionResult.projectFolderId || boxFileParentId
        break

      case 'monthly_invoice':
        const invoiceResult = await prepareMonthlyInvoiceDocument(monthlyInvoiceId!)
        if (!invoiceResult.success) {
          return NextResponse.json({ error: invoiceResult.error }, { status: 400 })
        }
        documentData = invoiceResult.documentData
        fileName = `月次請求書_${invoiceResult.contractorName}_${invoiceResult.billingPeriod}.pdf`
        break

      default:
        return NextResponse.json({ error: '無効なドキュメントタイプです' }, { status: 400 })
    }

    // 3. PDFドキュメント生成
    console.log('📄 PDF生成中...', fileName)
    if (!documentData) {
      return NextResponse.json({ error: 'Document data is required' }, { status: 400 })
    }
    const pdfBuffer = await documentGenerator.generateDocument(templateId, documentData)

    // 4. Box にファイルアップロード
    console.log('📤 Boxにアップロード中...', { fileName, parentId: boxFileParentId })
    const uploadResult = await uploadFileToBox(boxFileParentId, fileName, pdfBuffer as unknown as ArrayBuffer)
    const boxFileId = uploadResult.entries[0].id

    // 5. Box Sign 署名リクエスト作成
    console.log('✍️ Box Sign リクエスト作成中...')
    const signatureResult = await boxSignAPI.createSignatureRequest({
      documentName: fileName,
      boxFileId: boxFileId,
      signers: signers || (type === 'monthly_invoice'
        ? createMonthlyInvoiceSigners(documentData.contractorEmail!, documentData.contractorName!)
        : createProjectSigners(documentData.contractorEmail!, documentData.clientEmail!, documentData.contractorName!, documentData.clientName!)
      ),
      message: message || `${fileName}の署名をお願いいたします`,
      daysUntilExpiration
    })

    if (!signatureResult.success) {
      return NextResponse.json({ error: signatureResult.error }, { status: 500 })
    }

    // 6. データベースに署名リクエスト記録
    const { data: signRequest, error: insertError } = await supabaseAdmin
      .from('box_sign_requests')
      .insert({
        project_id: projectId,
        contract_id: contractId,
        monthly_invoice_id: monthlyInvoiceId,
        template_id: templateId,
        box_sign_request_id: signatureResult.signRequestId,
        document_type: type,
        document_type_category: type === 'monthly_invoice' ? 'monthly_invoice' : 'project',
        status: 'sent',
        signers: signers || [],
        source_document_id: boxFileId,
        sent_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + daysUntilExpiration * 24 * 60 * 60 * 1000).toISOString()
      })
      .select()
      .single()

    if (insertError) {
      console.error('❌ 署名リクエスト記録エラー:', insertError)
      return NextResponse.json({ error: 'データベース記録エラー' }, { status: 500 })
    }

    // 7. 署名者履歴の記録
    const signersData = (signers || []).map((signer: any) => ({
      sign_request_id: signRequest.id,
      signer_email: signer.email,
      signer_role: signer.role,
      signer_name: signer.name
    }))

    if (signersData.length > 0) {
      await supabaseAdmin
        .from('document_signatures')
        .insert(signersData)
    }

    console.log('✅ Box Sign リクエスト作成完了:', signRequest.id)

    return NextResponse.json({
      success: true,
      signRequestId: signRequest.id,
      boxSignRequestId: signatureResult.signRequestId,
      fileName,
      signingUrls: signatureResult.signingUrls,
      prepareUrl: signatureResult.prepareUrl
    })

  } catch (error: any) {
    console.error('❌ Box Sign リクエスト作成エラー:', error)
    return NextResponse.json({
      error: 'サーバーエラー',
      details: error.message
    }, { status: 500 })
  }
}

// 発注書ドキュメント準備
async function prepareOrderDocument(projectId: string, contractId?: string) {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select(`
      *,
      organization:organizations(name, billing_email),
      created_by_user:users!projects_created_by_fkey(name, email)
    `)
    .eq('id', projectId)
    .single()

  if (!project) {
    return { success: false, error: 'プロジェクトが見つかりません' }
  }

  // 受注者情報取得（契約から）
  let contractor = null
  if (contractId) {
    const { data: contract } = await supabaseAdmin
      .from('contracts')
      .select('contractor:users!contracts_contractor_id_fkey(name, email)')
      .eq('id', contractId)
      .single()

    contractor = contract?.contractor
  }

  if (!contractor) {
    return { success: false, error: '受注者情報が見つかりません' }
  }

  const documentData = createOrderDocumentData(
    project,
    contractor,
    {
      name: project.organization?.name,
      email: project.organization?.billing_email || project.created_by_user?.email
    }
  )

  return {
    success: true,
    documentData,
    projectTitle: project.title,
    projectFolderId: project.box_folder_id
  }
}

// 完了届ドキュメント準備
async function prepareCompletionDocument(projectId: string) {
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select(`
      *,
      organization:organizations(name, billing_email),
      created_by_user:users!projects_created_by_fkey(name, email),
      contracts(contractor:users!contracts_contractor_id_fkey(name, email))
    `)
    .eq('id', projectId)
    .single()

  if (!project) {
    return { success: false, error: 'プロジェクトが見つかりません' }
  }

  const contractor = project.contracts?.[0]?.contractor
  if (!contractor) {
    return { success: false, error: '受注者情報が見つかりません' }
  }

  const documentData = createCompletionDocumentData(
    project,
    contractor,
    {
      name: project.organization?.name,
      email: project.organization?.billing_email || project.created_by_user?.email
    }
  )

  return {
    success: true,
    documentData,
    projectTitle: project.title,
    projectFolderId: project.box_folder_id
  }
}

// 月次請求書ドキュメント準備
async function prepareMonthlyInvoiceDocument(monthlyInvoiceId: string) {
  const { data: invoice } = await supabaseAdmin
    .from('monthly_invoices')
    .select(`
      *,
      contractor:users!monthly_invoices_contractor_id_fkey(name, email),
      projects:monthly_invoice_projects(*)
    `)
    .eq('id', monthlyInvoiceId)
    .single()

  if (!invoice) {
    return { success: false, error: '月次請求書が見つかりません' }
  }

  const documentData = createMonthlyInvoiceDocumentData(
    invoice,
    invoice.contractor,
    invoice.projects
  )

  return {
    success: true,
    documentData,
    contractorName: invoice.contractor.name,
    billingPeriod: `${invoice.billing_year}年${invoice.billing_month}月`
  }
}