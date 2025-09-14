import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Service Role Keyを使用してSupabaseクライアントを作成
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

    const demoEmails = [
      'admin@demo.com',
      'contractor@demo.com',
      'reviewer@demo.com'
    ]

    const results = []

    for (const email of demoEmails) {
      try {
        // ユーザーをメールアドレスで検索
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          results.push({
            email,
            status: 'error',
            message: 'ユーザーリストの取得に失敗: ' + listError.message
          })
          continue
        }

        // 該当するユーザーを検索
        const user = users.users.find(u => u.email === email)
        
        if (user) {
          // ユーザーを削除
          const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
          
          if (deleteError) {
            results.push({
              email,
              status: 'error',
              message: 'ユーザー削除に失敗: ' + deleteError.message
            })
          } else {
            results.push({
              email,
              status: 'deleted',
              message: 'Authユーザーを削除しました'
            })
          }
        } else {
          results.push({
            email,
            status: 'not_found',
            message: 'ユーザーが見つかりません'
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
      message: 'Authユーザーの削除が完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Delete auth users error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
