import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Service Role Keyを使用してSupabaseクライアントを作成
    const supabaseAdmin = createSupabaseAdmin()

    const demoEmails = [
      'admin@demo.com',
      'contractor@demo.com',
      'reviewer@demo.com'
    ]

    const results = []

    for (const email of demoEmails) {
      try {
        // 1. usersテーブルから削除
        const { error: userError } = await supabaseAdmin
          .from('users')
          .delete()
          .eq('email', email)

        if (userError) {
          console.error(`Delete user error for ${email}:`, userError)
        }

        // 2. membershipsテーブルから削除
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', email)
          .single()

        if (userData) {
          const { error: membershipError } = await supabaseAdmin
            .from('memberships')
            .delete()
            .eq('user_id', userData.id)

          if (membershipError) {
            console.error(`Delete membership error for ${email}:`, membershipError)
          }
        }

        // 3. Authテーブルから削除
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
        
        if (!listError && users) {
          const user = users.users.find(u => u.email === email)
          
          if (user) {
            const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
            
            if (deleteError) {
              console.error(`Delete auth user error for ${email}:`, deleteError)
            }
          }
        }

        results.push({
          email,
          status: 'reset',
          message: '完全にリセットしました'
        })

      } catch (error: any) {
        results.push({
          email,
          status: 'error',
          message: 'リセットエラー: ' + error.message
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントの完全リセットが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Complete reset demo error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
