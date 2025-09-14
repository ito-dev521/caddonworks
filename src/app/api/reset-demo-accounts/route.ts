import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const demoEmails = [
      'admin@demo.com',
      'contractor@demo.com',
      'reviewer@demo.com'
    ]

    const results = []

    // 既存のデモアカウントを削除
    for (const email of demoEmails) {
      try {
        // usersテーブルから削除
        const { error: userError } = await supabase
          .from('users')
          .delete()
          .eq('email', email)

        if (userError) {
          console.error(`Delete user error for ${email}:`, userError)
        }

        // membershipsテーブルから削除
        const { data: userData } = await supabase
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (userData) {
          const { error: membershipError } = await supabase
            .from('memberships')
            .delete()
            .eq('user_id', userData.id)

          if (membershipError) {
            console.error(`Delete membership error for ${email}:`, membershipError)
          }
        }

        results.push({
          email,
          status: 'deleted',
          message: '既存のアカウントを削除しました'
        })

      } catch (error: any) {
        results.push({
          email,
          status: 'error',
          message: '削除エラー: ' + error.message
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのリセットが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Reset demo accounts error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
