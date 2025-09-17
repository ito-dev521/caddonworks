import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    const demoEmails = [
      'admin@demo.com',
      'orgadmin@demo.com',
      'orgadmin2@demo.com',
      'contractor@demo.com',
      'contractor2@demo.com',
      'reviewer@demo.com'
    ]

    const results = []

    for (const email of demoEmails) {
      try {
        // usersテーブルからauth_user_idを取得
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .select('auth_user_id')
          .eq('email', email)
          .single()

        if (userError || !userData) {
          results.push({
            email,
            status: 'not_found',
            message: 'ユーザーが見つかりません'
          })
          continue
        }

        // メール確認を有効にする
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userData.auth_user_id,
          {
            email_confirm: true
          }
        )

        if (updateError) {
          results.push({
            email,
            status: 'update_error',
            message: `更新エラー: ${updateError.message}`
          })
          continue
        }

        results.push({
          email,
          status: 'success',
          message: 'メール確認を有効にしました'
        })

      } catch (error) {
        console.error(`Error processing ${email}:`, error)
        results.push({
          email,
          status: 'error',
          message: `予期しないエラー: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのメール確認状態を更新しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Demo email confirmation error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}