import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { documentGenerator } from '@/lib/document-generator'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdmin()
    const invoiceId = params.id

    // 請求書を取得
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        id,
        invoice_number,
        base_amount,
        system_fee,
        total_amount,
        issue_date,
        due_date,
        status,
        direction,
        memo,
        project_id,
        contract_id,
        contractor_id,
        org_id,
        projects:project_id (
          id,
          title,
          start_date,
          end_date,
          organizations:org_id (
            id,
            name,
            address,
            phone,
            email,
            invoice_registration_number
          )
        ),
        contracts:contract_id (
          id,
          bid_amount
        ),
        users:contractor_id (
          id,
          display_name,
          email,
          address
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json({ message: '請求書が見つかりません' }, { status: 404 })
    }

    // PDF生成用のデータを準備
    const documentData = {
      type: 'monthly_invoice' as const,
      title: '請求書',
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      dueDate: invoice.due_date,

      // 請求元（運営者から発注者への請求の場合）
      contractorName: invoice.direction === 'from_operator'
        ? '株式会社キャドン' // 運営者名
        : invoice.users?.display_name || '',
      contractorEmail: invoice.direction === 'from_operator'
        ? 'info@caddon.works'
        : invoice.users?.email || '',
      contractorAddress: invoice.direction === 'from_operator'
        ? '東京都'
        : invoice.users?.address || '',

      // 請求先
      clientName: invoice.projects?.organizations?.name || '',
      clientEmail: invoice.projects?.organizations?.email || '',
      clientAddress: invoice.projects?.organizations?.address || '',

      // プロジェクト情報
      projectTitle: invoice.projects?.title || '',
      projectAmount: invoice.base_amount,

      // 請求書固有の情報
      billingPeriod: `${invoice.issue_date || ''} 締め`,
      systemFeeTotal: invoice.system_fee || 0,
      totalAmount: invoice.total_amount || 0,

      // プロジェクト一覧（月次請求の場合）
      projectList: [{
        title: invoice.projects?.title || '',
        amount: invoice.base_amount || 0,
        completionDate: invoice.issue_date || '',
        systemFee: invoice.system_fee || 0
      }],

      notes: invoice.memo || '',
      createdAt: new Date().toLocaleDateString('ja-JP')
    }

    // PDFを生成
    const pdfBuffer = await documentGenerator.generateDocument('monthly_invoice', documentData)

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice_${invoice.invoice_number}.pdf"`
      }
    })

  } catch (error) {
    console.error('請求書PDF生成エラー:', error)
    return NextResponse.json(
      { message: 'PDF生成に失敗しました' },
      { status: 500 }
    )
  }
}
