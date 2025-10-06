import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { calculateContractorPayout, calculateOrgInvoice } from '@/lib/billing'
import { generatePdfPlaceholder } from '@/lib/pdf'

export const dynamic = 'force-dynamic'

// 業務完了届（contract_id基準）から、
// 受注者向け請求（contractor->operator）と、後続の事業者請求の下準備を作成

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin()
  try {
    const body = await request.json()
    const { contract_id } = body as { contract_id: string }
    if (!contract_id) {
      return NextResponse.json({ message: 'contract_id is required' }, { status: 400 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, project_id, contractor_id, org_id, bid_amount, status')
      .eq('id', contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // 受注者の種別（個人/法人）を users テーブルのメタから判定（仮: company_number の有無）
    const { data: contractor, error: contractorError } = await supabase
      .from('users')
      .select('id, company_number')
      .eq('id', contract.contractor_id)
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json({ message: '受注者が見つかりません' }, { status: 404 })
    }

    const isCorporation = !!contractor.company_number
    const payoutCalc = calculateContractorPayout({
      businessType: isCorporation ? 'corporation' : 'individual',
      totalBilled: contract.bid_amount || 0,
    })

    // 受注者向け請求（direction = to_operator）を作成
    // 簡易PDFを作成（JSONプレースホルダ）
    const pdfUrl = await generatePdfPlaceholder({
      title: '請求書（受注者→運営）',
      issueDate: new Date().toISOString().slice(0,10),
      party: { name: String(contract.contractor_id) },
      items: [{ description: `契約 ${contract.id}`, amount: contract.bid_amount || 0 }],
      totals: { subtotal: contract.bid_amount || 0, total: payoutCalc.netAmount }
    })

    const { data: contractorInvoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        direction: 'to_operator',
        contractor_id: contract.contractor_id,
        contract_id: contract.id,
        org_id: contract.org_id,
        subtotal: contract.bid_amount || 0,
        tax_withholding: payoutCalc.withholdingTax,
        transfer_fee: payoutCalc.transferFee,
        total_amount: payoutCalc.netAmount,
        pdf_url: pdfUrl,
        status: 'pending'
      })
      .select()
      .single()

    if (invErr) {
      return NextResponse.json({ message: '受注者請求の作成に失敗しました' }, { status: 500 })
    }

    // 後続の発注者向け請求の集計は月次APIで行うため、ここではレコード作成のみ
    return NextResponse.json({ message: '生成完了', contractorInvoice }, { status: 200 })
  } catch (error) {
    console.error('generate-from-completion error:', error)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}


