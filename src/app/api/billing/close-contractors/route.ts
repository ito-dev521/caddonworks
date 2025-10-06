import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { calculateContractorPayout } from '@/lib/billing'

export const dynamic = 'force-dynamic'

// 20日締め → 月末支払いの受注者集計を作成
// GET /api/billing/close-contractors?year=2025&month=9

export async function GET(request: NextRequest) {
  const supabase = createSupabaseAdmin()
  try {
    const { searchParams } = new URL(request.url)
    const year = Number(searchParams.get('year')) || new Date().getFullYear()
    const month = Number(searchParams.get('month')) || (new Date().getMonth() + 1)

    // 締め区間: 前月21日〜当月20日
    const periodEnd = new Date(Date.UTC(year, month - 1, 20))
    const periodStart = new Date(Date.UTC(year, month - 2, 21))

    // 当月末の支払予定日
    const scheduledPayDate = new Date(Date.UTC(year, month, 0))

    // 期間内の受注者請求（to_operator）を集計
    const { data: contractorInvoices, error: invErr } = await supabase
      .from('invoices')
      .select('id, contractor_id, subtotal')
      .eq('direction', 'to_operator')
      .gte('issue_date', periodStart.toISOString().slice(0,10))
      .lte('issue_date', periodEnd.toISOString().slice(0,10))

    if (invErr) {
      return NextResponse.json({ message: '請求データ取得に失敗' }, { status: 500 })
    }

    // 受注者の事業種別を取得
    const contractorIds = Array.from(new Set((contractorInvoices || []).map(i => i.contractor_id).filter(Boolean)))
    const { data: contractors } = await supabase
      .from('users')
      .select('id, company_number')
      .in('id', contractorIds)

    const isCorp = new Map<string, boolean>()
    for (const u of contractors || []) {
      isCorp.set(u.id, !!u.company_number)
    }

    // 受注者別に集計し、payoutsに登録（upsert相当）
    const totals = new Map<string, number>()
    for (const inv of contractorInvoices || []) {
      const prev = totals.get(inv.contractor_id) || 0
      totals.set(inv.contractor_id, prev + (inv.subtotal || 0))
    }

    const results: any[] = []
    for (const [contractorId, total] of Array.from(totals.entries())) {
      const calc = calculateContractorPayout({
        businessType: isCorp.get(contractorId) ? 'corporation' : 'individual',
        totalBilled: total,
      })

      const { data: payout, error: payoutErr } = await supabase
        .from('payouts')
        .insert({
          contractor_id: contractorId,
          period_start: periodStart.toISOString().slice(0,10),
          period_end: periodEnd.toISOString().slice(0,10),
          scheduled_pay_date: scheduledPayDate.toISOString().slice(0,10),
          gross_amount: calc.grossAmount,
          tax_withholding: calc.withholdingTax,
          transfer_fee: calc.transferFee,
          net_amount: calc.netAmount,
          status: 'scheduled'
        })
        .select()
        .single()

      if (payoutErr) {
        return NextResponse.json({ message: 'payout作成に失敗' }, { status: 500 })
      }
      results.push(payout)
    }

    return NextResponse.json({
      period: {
        start: periodStart.toISOString().slice(0,10),
        end: periodEnd.toISOString().slice(0,10),
        payDate: scheduledPayDate.toISOString().slice(0,10)
      },
      payouts: results
    })
  } catch (error) {
    console.error('close-contractors error:', error)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}


