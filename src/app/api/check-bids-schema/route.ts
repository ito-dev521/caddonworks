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
    console.log('bidsテーブル構造確認開始')

    // bidsテーブルの構造を確認
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .from('bids')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('bidsテーブル確認エラー:', tableError)
      return NextResponse.json({
        error: 'bidsテーブルの確認に失敗しました',
        details: tableError.message
      }, { status: 500 })
    }

    // テーブルの列情報を取得（サンプルデータから推測）
    const columns = tableInfo?.[0] ? Object.keys(tableInfo[0]) : []

    // サンプルデータを取得
    const { data: sampleData, error: sampleError } = await supabaseAdmin
      .from('bids')
      .select('*')
      .limit(3)

    return NextResponse.json({
      tableExists: true,
      columns: columns,
      sampleData: sampleData || [],
      rowCount: sampleData?.length || 0,
      hasBudgetApproved: tableInfo?.[0] ? 'budget_approved' in tableInfo[0] : false
    }, { status: 200 })

  } catch (error) {
    console.error('bidsテーブル確認エラー:', error)
    return NextResponse.json({
      error: 'サーバーエラーが発生しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 })
  }
}
