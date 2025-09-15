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
    console.log('テーブル存在確認開始')

    // 各テーブルの存在確認
    const tables = ['users', 'organizations', 'memberships', 'projects', 'bids', 'contracts', 'notifications']
    const results: any = {}

    for (const table of tables) {
      try {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('*')
          .limit(1)

        if (error) {
          results[table] = { exists: false, error: error.message }
        } else {
          results[table] = { exists: true, count: data?.length || 0 }
        }
      } catch (err: any) {
        results[table] = { exists: false, error: err.message }
      }
    }

    console.log('テーブル存在確認結果:', results)

    return NextResponse.json({
      message: 'テーブル存在確認完了',
      tables: results
    }, { status: 200 })

  } catch (error) {
    console.error('テーブル確認エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
