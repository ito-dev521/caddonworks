import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // 認証チェック（Vercel Cronからのリクエストかどうか）
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    // 期限切れ案件チェックAPIを呼び出し
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000'
    
    const response = await fetch(`${baseUrl}/api/jobs/check-expired`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.message || '期限切れ案件チェックに失敗しました')
    }

    return NextResponse.json({
      message: '期限切れ案件チェックが完了しました',
      timestamp: new Date().toISOString(),
      results: result.results
    }, { status: 200 })

  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        message: 'Cron job failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
