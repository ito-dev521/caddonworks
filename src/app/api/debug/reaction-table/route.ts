import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // message_reactionsテーブルに直接アクセスして存在確認
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('message_reactions')
      .select('*')
      .limit(1)

    if (sampleError) {
      console.error('テーブルアクセスエラー:', sampleError)
      return NextResponse.json({ 
        message: 'message_reactionsテーブルにアクセスできません',
        error: sampleError.message,
        code: sampleError.code,
        details: sampleError.details,
        hint: sampleError.hint
      }, { status: 500 })
    }

    // より多くのサンプルデータを取得
    const { data: moreSampleData, error: moreSampleError } = await supabaseAdmin
      .from('message_reactions')
      .select('*')
      .limit(5)

    return NextResponse.json({
      message: 'テーブル確認完了',
      tableExists: true,
      sampleData: sampleData,
      moreSampleData: moreSampleData,
      moreSampleError: moreSampleError?.message
    }, { status: 200 })

  } catch (error) {
    console.error('デバッグエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
