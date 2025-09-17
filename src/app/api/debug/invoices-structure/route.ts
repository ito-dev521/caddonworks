import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 既存のinvoicesテーブルからデータを取得（カラムを指定せずに）
    const { data: existingInvoices, error: selectError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(1)

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
      message: 'invoicesテーブル構造確認結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Invoices structure debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    )
  }
}
