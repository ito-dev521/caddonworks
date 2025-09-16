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


