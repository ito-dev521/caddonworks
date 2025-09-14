import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const demoEmails = [
      'admin@ii-stylelab.com',
      'contractor@ii-stylelab.com',
      'reviewer@ii-stylelab.com'
    ]

    const results = []

    for (const email of demoEmails) {
      try {
        // Supabaseのauth.usersテーブルでメール確認を更新
        const { data: authUser, error: authError } = await supabase.auth.admin.getUserByEmail(email)
        
        if (authError || !authUser.user) {
          results.push({
            email,
            status: 'error',
            message: 'ユーザーが見つかりません: ' + (authError?.message || 'Unknown error')
          })
          continue
        }

        // メール確認を更新
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          authUser.user.id,
          {
            email_confirm: true
          }
        )

        if (updateError) {
          results.push({
            email,
            status: 'error',
            message: 'メール確認の更新に失敗: ' + updateError.message
          })
        } else {
          results.push({
            email,
            status: 'success',
            message: 'メール確認を有効にしました'
          })
        }

      } catch (error: any) {
        results.push({
          email,
          status: 'error',
          message: 'エラー: ' + error.message
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのメール確認処理が完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Confirm demo emails error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
