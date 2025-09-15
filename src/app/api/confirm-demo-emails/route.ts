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
    const demoEmails = [
      'admin@demo.com',
      'contractor@demo.com',
      'reviewer@demo.com'
    ]

    const results = []

    for (const email of demoEmails) {
      try {
        // ユーザーを検索
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (listError) {
          results.push({
            email,
            status: 'error',
            message: listError.message
          })
          continue
        }

        const user = users.users.find(u => u.email === email)
        
        if (!user) {
          results.push({
            email,
            status: 'not_found',
            message: 'ユーザーが見つかりません'
          })
          continue
        }

        // メール確認を有効化
        const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            email_confirm: true
          }
        )

        if (updateError) {
          results.push({
            email,
            status: 'error',
            message: updateError.message
          })
          continue
        }

        results.push({
          email,
          status: 'success',
          message: 'メール確認を有効化しました'
        })

      } catch (error) {
        results.push({
          email,
          status: 'error',
          message: '予期しないエラーが発生しました'
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのメール確認が完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Email confirmation error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}