import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { calculateOrgInvoice } from '@/lib/billing'
import { generatePdfPlaceholder } from '@/lib/pdf'

// 発注者向け: 20日締め → 翌月5日支払いの請求書作成
// GET /api/billing/invoice-orgs?year=2025&month=9&org_id=...

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdmin()
  try {
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) || (new Date().getMonth() + 1)
    const orgId = searchParams.get('org_id') || ''
    if (!orgId) return NextResponse.json({ message: 'org_id is required' }, { status: 400 })

    const periodEnd = new Date(Date.UTC(year, month - 1, 20))
    const periodStart = new Date(Date.UTC(year, month - 2, 21))

    // 翌月5日
    const payDate = new Date(Date.UTC(year, month, 5))

    // 期間内の受注者請求の合計（この会社の契約に紐づくもの）
    const { data: invoices, error: invErr } = await supabase
      .from('invoices')
      .select('subtotal')
      .eq('direction', 'to_operator')
      .eq('org_id', orgId)
      .gte('issue_date', periodStart.toISOString().slice(0,10))
      .lte('issue_date', periodEnd.toISOString().slice(0,10))

    if (invErr) {
      return NextResponse.json({ message: '請求集計に失敗' }, { status: 500 })
    }

    const contractorsTotal = (invoices || []).reduce((sum, i) => sum + (i.subtotal || 0), 0)
    const calc = calculateOrgInvoice({ contractorsTotal })

    const pdfUrl = await generatePdfPlaceholder({
      title: '発注者向け月次請求書',
      issueDate: new Date().toISOString().slice(0,10),
      dueDate: payDate.toISOString().slice(0,10),
      party: { name: String(orgId) },
      items: [{ description: `期間 ${periodStart.toISOString().slice(0,10)}〜${periodEnd.toISOString().slice(0,10)}`, amount: calc.contractorsTotal }],
      totals: { subtotal: calc.contractorsTotal, adjustments: calc.operatorFee, total: calc.totalAmount }
    })

    const { data: statement, error: stmtErr } = await supabase
      .from('monthly_statements')
      .insert({
        org_id: orgId,
        period_start: periodStart.toISOString().slice(0,10),
        period_end: periodEnd.toISOString().slice(0,10),
        due_date: payDate.toISOString().slice(0,10),
        contractors_total: calc.contractorsTotal,
        operator_fee: calc.operatorFee,
        total_amount: calc.totalAmount,
        pdf_url: pdfUrl,
        status: 'issued'
      })
      .select()
      .single()

    if (stmtErr) {
      return NextResponse.json({ message: '発注者向け請求の作成に失敗' }, { status: 500 })
    }

    return NextResponse.json({ statement })
  } catch (error) {
    console.error('invoice-orgs error:', error)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}


