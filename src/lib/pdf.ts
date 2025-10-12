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
import fontkit from '@pdf-lib/fontkit'
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

  // fontkitを登録（カスタムフォント使用に必要）
  pdfDoc.registerFontkit(fontkit)

  const page = pdfDoc.addPage([595.28, 841.89])

  // 日本語フォントを読み込み（利用不可の場合はHelveticaにフォールバック）
  const jpFontData = loadJPFont()
  const font = jpFontData
    ? await pdfDoc.embedFont(jpFontData)
    : await pdfDoc.embedFont(StandardFonts.Helvetica)

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
    building?: string | null // ビル名・階数
    contact?: string | null // 代表者名
    representativeTitle?: string // 代表者肩書（デフォルト: 代表取締役）
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
  supportFee?: number // サポート利用料（オプション）
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

  // fontkitを登録（カスタムフォント使用に必要）
  pdfDoc.registerFontkit(fontkit)

  const page = pdfDoc.addPage([595.28, 841.89]) // A4
  const jpFontData = loadJPFont()
  const font = jpFontData
    ? await pdfDoc.embedFont(jpFontData)
    : await pdfDoc.embedFont(StandardFonts.Helvetica)

  // 英数字専用フォント（注文番号など）
  const enFont = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const draw = (t: string, x: number, y: number, s = 10, useEnFont = false) =>
    page.drawText(t ?? '', { x, y, size: s, font: useEnFont ? enFont : font, color: rgb(0, 0, 0) })

  // ヘッダ（左右）
  // 左側：発注者（固定情報）
  let issuerY = 815
  draw('福岡県福岡市早良区西新1-10-13', 50, issuerY)
  issuerY -= 15
  draw('西新新田ビル403', 50, issuerY)
  issuerY -= 15
  draw('イースタイルラボ株式会社', 50, issuerY)
  issuerY -= 15
  draw('代表取締役　井上直樹', 50, issuerY)

  // 右側：請負者（受注者）
  console.log('請負者データ:', JSON.stringify(data.contractor))
  draw('（請負者）', 420, 815)
  if (data.contractor.address) {
    // 住所を適切な位置で2行に分割
    const address = data.contractor.address
    // 「丁目」の後で分割、なければ20文字で分割
    const splitIndex = address.indexOf('丁目') !== -1 ? address.indexOf('丁目') + 2 : 20
    if (address.length > splitIndex) {
      // 長い場合は2行に分割
      const line1 = address.substring(0, splitIndex)
      const line2 = address.substring(splitIndex)
      draw(line1, 420, 800, 9)
      draw(line2, 420, 788, 9)
    } else {
      draw(address, 420, 800, 9)
    }
  } else {
    console.log('請負者の住所が空です')
  }
  if (data.contractor.name) {
    draw(data.contractor.name, 420, 770, 10)
  } else {
    console.log('請負者の氏名が空です')
  }

  // タイトル
  draw('請 求 書', 270, 720, 18)

  // ボックス群
  const left = 40
  const width = 515
  let y = 700
  const rowH = 22

  const box = (label: string, content: string, cols = [120, width - 120], fontSize = 10, useEnFont = false) => {
    page.drawRectangle({ x: left, y: y - rowH, width, height: rowH, borderColor: rgb(0, 0, 0), borderWidth: 1 })
    page.drawLine({ start: { x: left + cols[0], y: y - rowH }, end: { x: left + cols[0], y: y }, color: rgb(0, 0, 0) })
    draw(label, left + 6, y - 15, fontSize)
    draw(content, left + cols[0] + 6, y - 15, fontSize, useEnFont)
    y -= rowH
  }

  // 注文番号の空白を完全に除去し、英数字フォントで描画
  const cleanOrderNo = (data.orderNo || '').replace(/\s+/g, '')
  box('注文番号', cleanOrderNo, [120, width - 120], 10, true)
  box('担当者', data.assignee || '')
  box('業務名', data.title)
  box('工期', `${data.period.from ?? ''} 〜 ${data.period.to ?? ''}`)

  // 金額詳細（税込ベース）
  const tax = Math.round(data.amountExcl * data.taxRate)
  const totalIncludingTax = data.amountExcl + tax
  const supportFee = data.supportFee || 0
  const subtotal = totalIncludingTax - supportFee
  const paymentAmount = subtotal - data.withHolding

  // 金額ボックス（高さを動的に調整）
  const numRows = supportFee > 0 ? 5 : 4
  page.drawRectangle({ x: left, y: y - rowH * numRows, width, height: rowH * numRows, borderColor: rgb(0, 0, 0), borderWidth: 1 })

  // 契約金額（税込）
  draw('契約金額（税込）', left + 6, y - 15)
  draw(`¥${totalIncludingTax.toLocaleString('ja-JP')}`, left + 400, y - 15)
  page.drawLine({ start: { x: left, y: y - rowH }, end: { x: left + width, y: y - rowH }, color: rgb(0, 0, 0) })
  y -= rowH

  // サポート利用料（該当する場合のみ）
  if (supportFee > 0) {
    draw('サポート利用料', left + 6, y - 15)
    draw(`-¥${supportFee.toLocaleString('ja-JP')}`, left + 400, y - 15)
    page.drawLine({ start: { x: left, y: y - rowH }, end: { x: left + width, y: y - rowH }, color: rgb(0, 0, 0) })
    y -= rowH
  }

  // 小計
  draw('小計', left + 6, y - 15)
  draw(`¥${subtotal.toLocaleString('ja-JP')}`, left + 400, y - 15)
  page.drawLine({ start: { x: left, y: y - rowH }, end: { x: left + width, y: y - rowH }, color: rgb(0, 0, 0) })
  y -= rowH

  // 源泉徴収税
  const withholdingRate = ((data.withHolding / subtotal) * 100).toFixed(2)
  draw(`源泉徴収税 (${withholdingRate}%)`, left + 6, y - 15)
  draw(`-¥${data.withHolding.toLocaleString('ja-JP')}`, left + 400, y - 15)
  page.drawLine({ start: { x: left, y: y - rowH }, end: { x: left + width, y: y - rowH }, color: rgb(0, 0, 0) })
  y -= rowH

  // お振込金額
  draw('お振込金額', left + 6, y - 15, 11)
  draw(`¥${paymentAmount.toLocaleString('ja-JP')}`, left + 400, y - 15, 12)
  y -= rowH

  box('支払日', data.dueDate || '')
  box('支払方法', data.payMethod)

  // 備考
  page.drawRectangle({ x: left, y: y - rowH * 2, width, height: rowH * 2, borderColor: rgb(0, 0, 0), borderWidth: 1 })
  draw('備考', left + 6, y - 15)
  draw(data.note || '※支払金額は振込手数料等、源泉徴収を控除した金額とする', left + 50, y - 15)
  y -= rowH * 2 + 10

  return Buffer.from(await pdfDoc.save())
}


