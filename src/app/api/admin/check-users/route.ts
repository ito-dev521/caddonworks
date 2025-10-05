import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ message: 'メールアドレスを指定してください' }, { status: 400 })
    }

    // ユーザーを検索
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .ilike('email', `%${email}%`)

    if (error) {
      console.error('ユーザー検索エラー:', error)
      return NextResponse.json({ message: 'ユーザー検索に失敗しました', error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      users,
      total: users?.length || 0
    })

  } catch (error: any) {
    console.error('エラー:', error)
    return NextResponse.json({ message: 'サーバーエラー', error: error.message }, { status: 500 })
  }
}
