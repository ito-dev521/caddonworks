import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 1. invoicesテーブルの存在確認
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'invoices')

    // 2. invoicesテーブルのカラム構造確認
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'invoices')
      .order('ordinal_position')

    // 3. invoicesテーブルのサンプルデータ確認
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(5)

    return NextResponse.json({
      tableExists: (tableExists?.length || 0) > 0,
      tableError,
      columns,
      columnsError,
      sampleData,
      sampleError
    }, { status: 200 })

  } catch (error) {
    console.error('Invoices table debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
