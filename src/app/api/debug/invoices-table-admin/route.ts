import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // Admin権限でinvoicesテーブルにアクセス
    const { data: invoices, error: invoicesError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(5)

    // テーブル構造を確認（Admin権限で）
    const { data: tableInfo, error: tableInfoError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(0)

    return NextResponse.json({
      invoices,
      invoicesError,
      tableInfo: tableInfoError ? { error: tableInfoError } : { success: true },
      message: 'Admin権限でのアクセス結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Invoices table admin debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
