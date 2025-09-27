import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

// 開発環境専用: 指定メールアドレスのパスワードを任意の値に更新
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ message: 'Not allowed' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const { email, newPassword } = await request.json()

    if (!email || !newPassword) {
      return NextResponse.json({ message: 'email と newPassword は必須です' }, { status: 400 })
    }

    // users テーブルから認証ユーザーIDを取得
    const { data: target, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id')
      .eq('email', String(email).toLowerCase())
      .maybeSingle()

    if (userErr || !target) {
      return NextResponse.json({ message: '対象ユーザーが見つかりません' }, { status: 404 })
    }
    if (!target.auth_user_id) {
      return NextResponse.json({ message: 'auth_user_id が未設定です' }, { status: 400 })
    }

    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(target.auth_user_id, {
      password: String(newPassword)
    })

    if (updErr) {
      return NextResponse.json({ message: 'パスワード更新に失敗しました', detail: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ message: '更新しました', email: target.email })
  } catch (error: any) {
    return NextResponse.json({ message: 'サーバーエラー', error: error?.message || String(error) }, { status: 500 })
  }
}


