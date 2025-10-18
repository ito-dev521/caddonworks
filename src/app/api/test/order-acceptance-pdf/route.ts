import { NextResponse } from 'next/server'
import { documentGenerator, createOrderAcceptanceDocumentData } from '@/lib/document-generator'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('📋 テスト用注文請書PDF生成開始')

    // テストデータを作成
    const testData = createOrderAcceptanceDocumentData(
      {
        title: 'テスト道路改良工事',
        amount: 5500000,
        start_date: '2025年10月1日',
        deadline: '2025年12月31日',
        location: '東京都千代田区霞が関1-2-3'
      },
      {
        name: '株式会社テスト建設',
        email: 'contractor@test-construction.co.jp',
        address: '東京都港区六本木1-2-3 テストビル5F',
        postal_code: '106-0032',
        phone_number: '03-1234-5678'
      },
      {
        name: '国土交通省関東地方整備局',
        email: 'client@mlit.go.jp'
      },
      {
        orderNumber: 'ORD-2025-0001',
        orderDate: '2025年10月1日'
      }
    )

    console.log('📊 テストデータ:', testData)

    // PDFを生成
    const pdfBuffer = await documentGenerator.generateDocument('order_acceptance', testData)

    console.log('✅ PDF生成完了:', pdfBuffer.length, 'bytes')

    // PDFをレスポンスとして返す
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="test_order_acceptance.pdf"',
        'Content-Length': pdfBuffer.length.toString()
      }
    })

  } catch (error: any) {
    console.error('❌ テスト用注文請書PDF生成エラー:', error)
    return NextResponse.json({
      message: 'PDF生成に失敗しました',
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
