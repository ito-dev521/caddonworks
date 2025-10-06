import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { renderTemplatePdf } from '@/lib/pdf'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

type Kind = 'invoice' | 'ack' | 'order'

const BUCKET = 'documents'

function buildSimplePdfBuffer(title: string, lines: string[], total?: number): Promise<Buffer> {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 })
    const buffers: Buffer[] = []
    doc.on('data', (d) => buffers.push(d as Buffer))
    doc.on('end', () => resolve(Buffer.concat(buffers)))

    doc.fontSize(18).text(title, { align: 'center' })
    doc.moveDown()
    doc.fontSize(10)
    for (const l of lines) doc.text(l)
    if (total !== undefined) {
      doc.moveDown()
      doc.rect(50, 200, 500, 80).stroke()
      doc.fontSize(12).text('金額', 60, 210)
      doc.fontSize(20).text(`${total.toLocaleString('ja-JP')} 円`, 60, 235)
    }
    doc.moveDown(2)
    doc.fontSize(10).text('注: 電子契約のため収入印紙は不要です。')
    doc.end()
  })
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseAdmin()
  try {
    const body = await request.json()
    const kind: Kind = body.kind
    const id: string = body.id
    if (!kind || !id) return NextResponse.json({ message: 'kind と id は必須です' }, { status: 400 })

    // 準備：バケット作成（存在しない場合）
    try {
      const { data: buckets } = await supabase.storage.listBuckets()
      if (!buckets?.some(b => b.name === BUCKET)) {
        await supabase.storage.createBucket(BUCKET, { public: false })
      }
    } catch { /* ignore */ }

    let title = 'ドキュメント'
    let total: number | undefined
    let path = ''
    let update: (() => Promise<any>) | null = null

    if (kind === 'invoice') {
      // monthly_statements
      const { data: st, error } = await supabase
        .from('monthly_statements')
        .select('id, org_id, period_start, period_end, total_amount, operator_fee, contractors_total')
        .eq('id', id)
        .single()
      if (error || !st) return NextResponse.json({ message: 'statement not found' }, { status: 404 })
      title = '請求書'
      total = st.total_amount
      const lines = [
        `期間: ${st.period_start} 〜 ${st.period_end}`,
        `受注者合計: ${st.contractors_total.toLocaleString('ja-JP')} 円`,
        `手数料(30%): ${st.operator_fee.toLocaleString('ja-JP')} 円`
      ]
      const pdf = await renderTemplatePdf('invoice', { title, lines, amount: total!, note: '発注者向け月次請求書' })
      path = `billing/statements/${st.id}.pdf`
      await supabase.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true })
      update = async () => supabase.from('monthly_statements').update({ pdf_url: `/storage/v1/object/${BUCKET}/${path}` }).eq('id', st.id)
    } else if (kind === 'ack') {
      // payouts
      const { data: po, error } = await supabase
        .from('payouts')
        .select('id, contractor_id, period_start, period_end, net_amount')
        .eq('id', id)
        .single()
      if (error || !po) return NextResponse.json({ message: 'payout not found' }, { status: 404 })
      title = '請書'
      total = po.net_amount
      const lines = [
        `期間: ${po.period_start} 〜 ${po.period_end}`,
        `受領金額: ${po.net_amount.toLocaleString('ja-JP')} 円`
      ]
      const pdf = await renderTemplatePdf('ack', { title, lines, amount: total!, note: '請書（受領確認）' })
      path = `billing/payouts/${po.id}.pdf`
      await supabase.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true })
      update = async () => supabase.from('payouts').update({ statement_pdf_url: `/storage/v1/object/${BUCKET}/${path}` }).eq('id', po.id)
    } else if (kind === 'order') {
      // invoices（to_operator）を注文書として流用
      const { data: inv, error } = await supabase
        .from('invoices')
        .select('id, contract_id, subtotal')
        .eq('id', id)
        .single()
      if (error || !inv) return NextResponse.json({ message: 'invoice not found' }, { status: 404 })
      title = '注文書'
      total = inv.subtotal
      const lines = [
        `契約ID: ${inv.contract_id}`,
        `契約金額: ${inv.subtotal.toLocaleString('ja-JP')} 円`
      ]
      const pdf = await renderTemplatePdf('order', { title, lines, amount: total!, note: '注文書（新規）' })
      path = `billing/orders/${inv.id}.pdf`
      await supabase.storage.from(BUCKET).upload(path, pdf, { contentType: 'application/pdf', upsert: true })
      update = async () => supabase.from('invoices').update({ pdf_url: `/storage/v1/object/${BUCKET}/${path}` }).eq('id', inv.id)
    }

    if (update) await update()
    return NextResponse.json({ url: `/storage/v1/object/${BUCKET}/${path}` })
  } catch (e) {
    console.error('generate-doc error', e)
    return NextResponse.json({ message: 'failed' }, { status: 500 })
  }
}


