import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // サーバーサイドでの環境変数の確認
    const envCheck = {
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      serviceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrlValue: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }

    return NextResponse.json({
      message: '環境変数チェック完了',
      env: envCheck,
      timestamp: new Date().toISOString()
    }, { status: 200 })

  } catch (error) {
    console.error('環境変数チェックエラー:', error)
    return NextResponse.json(
      { message: '環境変数チェックエラー: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
