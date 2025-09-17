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
    // admin@demo.comユーザーの現在の情報を取得
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single()

    // orgadmin@demo.comユーザーの情報も取得
    const { data: orgAdminUser, error: orgAdminError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'orgadmin@demo.com')
      .single()

    return NextResponse.json({
      message: 'ユーザー情報確認',
      adminUser: adminUser,
      adminUserError: userError,
      orgAdminUser: orgAdminUser,
      orgAdminUserError: orgAdminError
    }, { status: 200 })

  } catch (error) {
    console.error('check-users-simple API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}


