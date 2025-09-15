import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 簡単なテストレスポンス
    return NextResponse.json({
      message: 'API接続テスト成功',
      timestamp: new Date().toISOString(),
      test: true
    }, { status: 200 })

  } catch (error) {
    console.error('APIテストエラー:', error)
    return NextResponse.json(
      { message: 'APIテストエラー: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
