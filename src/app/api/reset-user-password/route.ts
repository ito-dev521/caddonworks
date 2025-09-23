import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePassword } from '@/lib/password-generator'

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

// ユーザーのパスワードをリセット
export async function POST(request: NextRequest) {
  try {
    const { email, new_password } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    console.log('パスワードリセット開始:', email)

    // 1. Supabase Authでユーザーを検索
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json(
        { message: 'ユーザー一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find(u => u.email === email)
    if (!authUser) {
      return NextResponse.json(
        { message: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // 2. パスワードを生成または使用
    const password = new_password || generatePassword()
    console.log('新しいパスワードを設定中...')

    // 3. パスワードを更新
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      {
        password: password,
        email_confirm: true
      }
    )

    if (updateError) {
      console.error('パスワード更新エラー:', updateError)
      return NextResponse.json(
        { message: 'パスワードの更新に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    console.log('パスワード更新完了')

    return NextResponse.json({
      message: 'パスワードが正常にリセットされました',
      email: email,
      new_password: password
    }, { status: 200 })

  } catch (error) {
    console.error('パスワードリセットエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}