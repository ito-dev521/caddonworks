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
    // usersテーブルの構造を確認
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'users')
      .order('ordinal_position')

    if (columnsError) {
      console.error('カラム情報取得エラー:', columnsError)
      return NextResponse.json(
        { message: 'カラム情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    // admin@demo.comユーザーの現在の情報を取得
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single()

    return NextResponse.json({
      message: 'usersテーブル構造とadmin@demo.comユーザー情報',
      tableColumns: columns,
      adminUser: adminUser,
      userError: userError
    }, { status: 200 })

  } catch (error) {
    console.error('check-users-table API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}











