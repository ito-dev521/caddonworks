// 簡易PDFテンプレ生成（今回はJSONプレースホルダを返すだけ）
// 実運用では serverless-pdf, @react-pdf/renderer などで置換

export interface InvoicePdfPayload {
  title: string
  issueDate: string
  dueDate?: string
  party: { name: string }
  items: Array<{ description: string; amount: number }>
  totals: { subtotal: number; adjustments?: number; total: number }
}

export async function generatePdfPlaceholder(payload: InvoicePdfPayload): Promise<string> {
  // 実装簡略化のため、JSONを文字列化して返す（S3に保存するなどに差し替え可能）
  const content = JSON.stringify(payload, null, 2)
  // 実運用ではここでストレージへアップロードしてURLを返す
  return `data:application/json;base64,${Buffer.from(content).toString('base64')}`
}

// --- 雛形に寄せた簡易テンプレの描画 ---
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import fs from 'fs'
import path from 'path'

export type DocKind = 'invoice' | 'ack' | 'order'

export interface BaseTemplateData {
  title: string
  lines: string[]
  amount: number
  note?: string
}

export async function renderTemplatePdf(kind: DocKind, data: BaseTemplateData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89])
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const drawText = (t: string, x: number, y: number, s = 12) => page.drawText(t, { x, y, size: s, font, color: rgb(0,0,0) })

  drawText(new Date().toLocaleDateString('ja-JP'), 500, 810, 10)
  drawText(data.title, 240, 790, 20)

  const left = 36
  const top = 700
  const width = 523
  const rowH = 18
  page.drawRectangle({ x: left, y: top - rowH * (data.lines.length + 1), width, height: rowH * (data.lines.length + 1), borderColor: rgb(0,0,0), borderWidth: 1 })
  data.lines.forEach((l, i) => {
    drawText(l, left + 8, top - 14 - rowH * i, 9)
    if (i < data.lines.length) {
      page.drawLine({ start: { x: left, y: top - rowH * (i + 1) }, end: { x: left + width, y: top - rowH * (i + 1) }, color: rgb(0,0,0) })
    }
  })

  const boxTop = top - rowH * (data.lines.length + 1) - 90
  page.drawRectangle({ x: left, y: boxTop, width, height: 70, borderColor: rgb(0,0,0), borderWidth: 1 })
  drawText('金額', left + 10, boxTop + 52, 12)
  drawText(`${data.amount.toLocaleString('ja-JP')} 円`, left + 70, boxTop + 30, 22)
  drawText(data.note || '注: 電子契約につき収入印紙は不要です。', left, boxTop - 16, 9)

  return Buffer.from(await pdfDoc.save())
}


// --- 日本語レイアウトの請求書PDF（簡易） ---
export interface JapaneseInvoiceData {
  issuer: { // 発注者（請求元）
    name: string
    address?: string
    contact?: string
    invoiceRegNo?: string | null
  }
  contractor: { // 請負者（受注者）
    name: string
    address?: string
  }
  orderNo: string // 契約IDなど
  assignee?: string | null // 担当者
  title: string // 業務名
  period: { from?: string | null; to?: string | null }
  amountExcl: number // 契約金額(税抜)
  taxRate: number // 0.1
  dueDate?: string | null
  payMethod: string
  note?: string
  withHolding: number // 源泉
}

function loadJPFont(): Uint8Array | null {
  try {
    const p = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf')
    if (fs.existsSync(p)) return fs.readFileSync(p)
  } catch {}
  try {
    const p = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
    if (fs.existsSync(p)) return fs.readFileSync(p)
  } catch {}
  return null
}

export async function renderJapaneseInvoicePdf(data: JapaneseInvoiceData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const jpFontData = loadJPFont()
  const font = jpFontData
    ? await pdfDoc.embedFont(jpFontData)
    : await pdfDoc.embedFont(StandardFonts.Helvetica)
  const draw = (t: string, x: number, y: number, s = 10) =>
    page.drawText(t ?? '', { x, y, size: s, font, color: rgb(0, 0, 0) })

  // ヘッダ（左右）
  draw('（発注者）', 50, 800)
  draw(data.issuer.address || '', 50, 785)
  draw(data.issuer.name || '', 50, 770)
  if (data.issuer.contact) draw(`代表者 ${data.issuer.contact}`, 50, 756)

  draw('（請負者）', 420, 800)
  if (data.issuer.invoiceRegNo) draw(`登録番号: ${data.issuer.invoiceRegNo}`, 420, 815)
  if (data.contractor.address) draw(data.contractor.address, 420, 785)
  draw(data.contractor.name || '', 420, 770)

  // タイトル
  draw('請 求 書', 270, 720, 18)

  // ボックス群
  const left = 40
  const width = 515
  let y = 700
  const rowH = 22

  const box = (label: string, content: string, cols = [120, width - 120]) => {
    page.drawRectangle({ x: left, y: y - rowH, width, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 1 })
    page.drawLine({ start: { x: left + cols[0], y: y - rowH }, end: { x: left + cols[0], y: y }, color: rgb(0, 0, 0) })
    draw(label, left + 6, y - 15)
    draw(content, left + cols[0] + 6, y - 15)
    y -= rowH
  }

  box('注文番号', data.orderNo)
  box('担当者', data.assignee || '')
  box('業務名', data.title)
  box('工期', `${data.period.from ?? ''} 〜 ${data.period.to ?? ''}`)

  // 金額ボックス
  const tax = Math.round(data.amountExcl * data.taxRate)
  const total = data.amountExcl + tax
  page.drawRectangle({ x: left, y: y - rowH * 2, width, height: rowH * 2, borderColor: rgb(0, 0, 0), borderWidth: 1 })
  page.drawLine({ start: { x: left + 250, y: y - rowH * 2 }, end: { x: left + 250, y: y }, color: rgb(0, 0, 0) })
  draw('契約金額', left + 6, y - 15)
  draw(`${data.amountExcl.toLocaleString('ja-JP')} 円`, left + 120, y - 15)
  draw('内、消費税(10%)', left + 260, y - 15)
  draw(`${tax.toLocaleString('ja-JP')} 円`, left + 390, y - 15)
  draw('税込金額', left + 260, y - 15 - rowH)
  draw(`${total.toLocaleString('ja-JP')} 円`, left + 390, y - 15 - rowH)
  y -= rowH * 2

  box('支払日', data.dueDate || '')
  box('支払方法', data.payMethod)

  // 備考
  page.drawRectangle({ x: left, y: y - rowH * 2, width, height: rowH * 2, borderColor: rgb(0, 0, 0), borderWidth: 1 })
  draw('備考', left + 6, y - 15)
  draw(data.note || '※支払金額は振込手数料等、源泉徴収を控除した金額とする', left + 50, y - 15)
  y -= rowH * 2 + 10

  // 合計、源泉
  draw(`小計:  ¥${data.amountExcl.toLocaleString('ja-JP')}`, left, y)
  draw(`消費税(10%):  ¥${tax.toLocaleString('ja-JP')}`, left + 180, y)
  draw(`合計:  ¥${total.toLocaleString('ja-JP')}`, left + 360, y)
  y -= 18
  draw(`源泉徴収税:  ¥${data.withHolding.toLocaleString('ja-JP')}`, left, y)

  return Buffer.from(await pdfDoc.save())
}


