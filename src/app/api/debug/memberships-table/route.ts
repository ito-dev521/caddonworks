import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 1. membershipsテーブルの存在確認
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'memberships')

    // 2. membershipsテーブルのカラム構造確認
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'memberships')
      .order('ordinal_position')

    // 3. membershipsテーブルのサンプルデータ確認
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('memberships')
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
    console.error('Memberships table debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
