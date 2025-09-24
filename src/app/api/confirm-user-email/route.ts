import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ message: 'メールアドレスが必要です' }, { status: 400 })
    }

    // 1. 指定されたメールアドレスのAuthユーザーを検索
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (listError) {
      console.error('ユーザー一覧取得エラー:', listError)
      return NextResponse.json({ message: 'ユーザー検索に失敗しました' }, { status: 500 })
    }

    const targetUser = authUsers.users.find(user => user.email === email)
    if (!targetUser) {
      return NextResponse.json({ message: '指定されたメールアドレスのユーザーが見つかりません' }, { status: 404 })
    }

    // 2. メール認証を手動で承認
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(targetUser.id, {
      email_confirm: true
    })

    if (error) {
      console.error('メール認証承認エラー:', error)
      return NextResponse.json(
        { message: 'メール認証の承認に失敗しました: ' + error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: `${email} のメール認証を手動で承認しました`,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed_at: data.user.email_confirmed_at,
        confirmed_at: data.user.confirmed_at
      }
    }, { status: 200 })

  } catch (error) {
    console.error('confirm-user-email API: エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
