import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 既存のinvoicesテーブルから実際のデータを取得
    const { data: existingInvoices, error: selectError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(5)

    // 空のオブジェクトを挿入してテーブル構造を確認
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('invoices')
      .insert({})
      .select()

    return NextResponse.json({
      existingInvoices,
      selectError,
      insertResult,
      insertError,
      message: '既存invoicesデータ確認結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Existing invoices debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    )
  }
}
