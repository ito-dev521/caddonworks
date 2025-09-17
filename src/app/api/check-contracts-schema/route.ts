import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {

    // contractsテーブルの構造を確認
    const { data, error } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .limit(1)

    if (error) {
      console.error('contractsテーブル構造確認エラー:', error)
      return NextResponse.json({
        message: 'contractsテーブル構造確認エラー',
        error: error.message
      }, { status: 400 })
    }

    // テーブル情報を取得
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('get_table_info', { table_name: 'contracts' })
      .single()


    return NextResponse.json({
      message: 'contractsテーブル構造確認完了',
      sampleData: data,
      tableInfo: tableInfo || 'テーブル情報取得不可'
    }, { status: 200 })

  } catch (error) {
    console.error('contractsテーブル構造確認エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
