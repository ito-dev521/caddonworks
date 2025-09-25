export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const contractId = searchParams.get('contractId')
    const monthlyInvoiceId = searchParams.get('monthlyInvoiceId')
    const status = searchParams.get('status')
    const documentType = searchParams.get('documentType')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // クエリ構築
    let query = supabaseAdmin
      .from('box_sign_requests')
      .select(`
        *,
        template:document_templates(name, type),
        project:projects(title),
        contract:contracts(id),
        monthly_invoice:monthly_invoices(billing_year, billing_month),
        signatures:document_signatures(*)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // フィルター適用
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (contractId) {
      query = query.eq('contract_id', contractId)
    }

    if (monthlyInvoiceId) {
      query = query.eq('monthly_invoice_id', monthlyInvoiceId)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (documentType) {
      query = query.eq('document_type', documentType)
    }

    const { data: requests, error } = await query

    if (error) {
      console.error('❌ 署名リクエスト取得エラー:', error)
      return NextResponse.json({ error: 'データベースエラー' }, { status: 500 })
    }

    // レスポンス整形
    const formattedRequests = requests?.map(request => ({
      id: request.id,
      boxSignRequestId: request.box_sign_request_id,
      documentType: request.document_type,
      status: request.status,

      // 関連データ
      template: request.template,
      project: request.project,
      contract: request.contract,
      monthlyInvoice: request.monthly_invoice,

      // 署名者情報（JSON形式で保存されている）
      signers: request.signers || [],
      signatures: request.signatures || [],

      // ファイル情報
      sourceDocumentId: request.source_document_id,
      signedDocumentId: request.signed_document_id,

      // タイミング情報
      createdAt: request.created_at,
      sentAt: request.sent_at,
      completedAt: request.completed_at,
      expiresAt: request.expires_at
    })) || []

    // 総件数取得（ページネーション用）
    let countQuery = supabaseAdmin
      .from('box_sign_requests')
      .select('*', { count: 'exact', head: true })

    // 同じフィルターを適用
    if (projectId) countQuery = countQuery.eq('project_id', projectId)
    if (contractId) countQuery = countQuery.eq('contract_id', contractId)
    if (monthlyInvoiceId) countQuery = countQuery.eq('monthly_invoice_id', monthlyInvoiceId)
    if (status) countQuery = countQuery.eq('status', status)
    if (documentType) countQuery = countQuery.eq('document_type', documentType)

    const { count } = await countQuery

    return NextResponse.json({
      requests: formattedRequests,
      pagination: {
        total: count || 0,
        offset,
        limit,
        hasMore: (count || 0) > offset + limit
      }
    })

  } catch (error: any) {
    console.error('❌ 署名リクエスト一覧取得エラー:', error)
    return NextResponse.json({
      error: 'サーバーエラー',
      details: error.message
    }, { status: 500 })
  }
}