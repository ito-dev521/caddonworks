import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib'

export const dynamic = 'force-dynamic'

// GET /api/billing/pdf?type=invoice&title=請求書&total=66000
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'invoice'
    const title = searchParams.get('title') || (type === 'order' ? '注文書' : type === 'ack' ? '請書' : '請求書')
    const total = Number(searchParams.get('total') || '0')

    const pdfDoc = await PDFDocument.create()
    const page = pdfDoc.addPage([595.28, 841.89]) // A4
    let font: PDFFont | null = null
    const tryLoadJapaneseFont = async () => {
      try {
        // Google FontsからNoto Sans JPを直接取得
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 10000)
        const url = 'https://fonts.gstatic.com/s/notosansjp/v52/o-0IIpQlx3QUlC5A4PNr5TRASf6M7Q.woff2'
        const res = await fetch(url, { signal: controller.signal })
        clearTimeout(timeout)
        
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const bytes = new Uint8Array(arrayBuffer)
          font = await pdfDoc.embedFont(bytes, { subset: false })
        } else {
          throw new Error(`Font fetch failed: ${res.status}`)
        }
      } catch (e) {
      }
      if (!font) {
        font = await pdfDoc.embedFont(StandardFonts.Helvetica)
      }
    }
    await tryLoadJapaneseFont()

    const sanitize = (s: string) => {
      if (font && (font.name === 'Helvetica' || (font as any).encodeText === PDFFont.prototype.encodeText)) {
        return s.replace(/[\u0100-\uFFFF]/g, '')
      }
      return s
    }

    const drawText = (text: string, x: number, y: number, size = 12) => {
      page.drawText(sanitize(text), { x, y, size, font: font!, color: rgb(0,0,0) })
    }

    // Header
    drawText(title, 240, 800, 18)
    drawText(`発行日: ${new Date().toLocaleDateString('ja-JP')}`, 50, 770, 10)
    drawText(`書類種別: ${type}`, 50, 755, 10)

    // Amount box
    page.drawRectangle({ x: 50, y: 650, width: 495, height: 80, borderColor: rgb(0,0,0), borderWidth: 1 })
    drawText('金額', 60, 710, 12)
    drawText(`${total.toLocaleString('ja-JP')} 円`, 60, 685, 20)

    drawText('注: 本書類は電子契約につき収入印紙は不要です。', 50, 630, 10)
    drawText('（レイアウトは雛形に基づく簡易版。正式テンプレは今後差し替え）', 50, 610, 10)

    const pdf = Buffer.from(await pdfDoc.save())

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="document.pdf"`
      }
    })
  } catch (e) {
    console.error('pdf generation error', e)
    return NextResponse.json({ message: 'failed' }, { status: 500 })
  }
}


