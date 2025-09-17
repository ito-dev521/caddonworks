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

export async function POST(request: NextRequest) {
  try {
    console.log('confirm-orgadmin-email API: 開始')

    // orgadmin@demo.comのメール確認を有効化
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      'e2fff1b9-5210-4fab-9336-1363336b90c9', // orgadmin@demo.comのauth_user_id
      {
        email_confirm: true
      }
    )

    if (error) {
      console.error('メール確認エラー:', error)
      return NextResponse.json(
        { message: 'メール確認の有効化に失敗しました: ' + error.message },
        { status: 500 }
      )
    }

    console.log('メール確認成功:', data)

    return NextResponse.json({
      message: 'orgadmin@demo.comのメール確認を有効化しました',
      user: data.user
    }, { status: 200 })

  } catch (error) {
    console.error('confirm-orgadmin-email API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}


