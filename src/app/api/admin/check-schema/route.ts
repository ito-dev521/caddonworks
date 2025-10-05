import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    // invoicesテーブルから1件取得してスキーマを確認
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)

    if (error) {
      return NextResponse.json({
        message: 'invoicesテーブルの確認に失敗しました',
        error: error.message,
        hint: error.hint,
        details: error.details
      }, { status: 500 })
    }

    // 列名を取得
    const columns = data && data.length > 0 ? Object.keys(data[0]) : []

    return NextResponse.json({
      message: 'invoicesテーブルのスキーマ情報',
      total_records: data?.length || 0,
      columns: columns,
      sample_data: data && data.length > 0 ? data[0] : null
    }, { status: 200 })

  } catch (error: any) {
    console.error('スキーマ確認エラー:', error)
    return NextResponse.json(
      {
        message: 'サーバーエラーが発生しました',
        error: error.message
      },
      { status: 500 }
    )
  }
}
