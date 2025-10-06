export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    const requestId = params.requestId

    // 1. データベースから署名リクエスト情報を取得
    const { data: signRequest, error } = await supabaseAdmin
      .from('box_sign_requests')
      .select(`
        *,
        template:document_templates(name, type),
        project:projects(title),
        contract:contracts(id),
        monthly_invoice:monthly_invoices(billing_year, billing_month),
        signatures:document_signatures(*)
      `)
      .eq('id', requestId)
      .single()

    if (error || !signRequest) {
      return NextResponse.json({ error: '署名リクエストが見つかりません' }, { status: 404 })
    }

    // 2. Box Sign APIから最新ステータスを取得
    let boxSignStatus = null
    if (signRequest.box_sign_request_id) {
      boxSignStatus = await boxSignAPI.getSignatureStatus(signRequest.box_sign_request_id)
    }

    // 3. データベースの状態と Box Sign の状態を同期
    if (boxSignStatus && boxSignStatus.status !== signRequest.status) {
      await syncSignatureStatus(signRequest.id, boxSignStatus)
    }

    // 4. レスポンス構築
    const response = {
      id: signRequest.id,
      boxSignRequestId: signRequest.box_sign_request_id,
      documentType: signRequest.document_type,
      status: boxSignStatus?.status || signRequest.status,

      // ドキュメント情報
      template: signRequest.template,
      project: signRequest.project,
      monthlyInvoice: signRequest.monthly_invoice,

      // 署名者情報
      signers: boxSignStatus?.signers || signRequest.signers,
      signatures: signRequest.signatures,

      // ファイル情報
      sourceDocumentId: signRequest.source_document_id,
      signedDocumentId: boxSignStatus?.signFiles?.files?.[0]?.id || signRequest.signed_document_id,

      // タイミング情報
      createdAt: signRequest.created_at,
      sentAt: signRequest.sent_at,
      completedAt: boxSignStatus?.completedAt || signRequest.completed_at,
      expiresAt: boxSignStatus?.expiresAt || signRequest.expires_at,

      // Box Sign 詳細情報
      boxSignStatus: boxSignStatus
    }

    return NextResponse.json(response)

  } catch (error: any) {
    console.error('❌ 署名ステータス取得エラー:', error)
    return NextResponse.json({
      error: 'サーバーエラー',
      details: error.message
    }, { status: 500 })
  }
}

// 署名ステータス同期
async function syncSignatureStatus(requestId: string, boxSignStatus: any) {
  try {
    const updateData: any = {
      status: boxSignStatus.status,
      updated_at: new Date().toISOString()
    }

    // 署名完了時の処理
    if (boxSignStatus.status === 'signed' && boxSignStatus.completedAt) {
      updateData.completed_at = boxSignStatus.completedAt

      // 署名済みドキュメントID更新
      if (boxSignStatus.signFiles?.files?.[0]?.id) {
        updateData.signed_document_id = boxSignStatus.signFiles.files[0].id
      }
    }

    // データベース更新
    await supabaseAdmin
      .from('box_sign_requests')
      .update(updateData)
      .eq('id', requestId)

    // 個別署名者のステータス更新
    if (boxSignStatus.signers) {
      for (const signer of boxSignStatus.signers) {
        if (signer.hasSigned && signer.signedAt) {
          await supabaseAdmin
            .from('document_signatures')
            .update({
              signed_at: signer.signedAt
            })
            .eq('sign_request_id', requestId)
            .eq('signer_email', signer.email)
        }
      }
    }

    console.log('✅ 署名ステータス同期完了:', { requestId, status: boxSignStatus.status })

  } catch (error) {
    console.error('❌ 署名ステータス同期エラー:', error)
  }
}