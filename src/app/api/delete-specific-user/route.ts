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
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json({ message: 'メールアドレスが必要です' }, { status: 400 })
    }

    console.log(`ユーザー削除開始: ${email}`)
    const results = []

    // 1. usersテーブルからユーザーを検索
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id')
      .eq('email', email)
      .maybeSingle()

    if (userError) {
      console.error('ユーザー検索エラー:', userError)
      results.push({ step: 'user_search', status: 'error', error: userError.message })
    }

    // 2. メンバーシップを削除
    if (userProfile) {
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .delete()
        .eq('user_id', userProfile.id)

      if (membershipError) {
        console.error('メンバーシップ削除エラー:', membershipError)
        results.push({ step: 'membership_delete', status: 'error', error: membershipError.message })
      } else {
        results.push({ step: 'membership_delete', status: 'success' })
      }

      // 3. ユーザープロフィールを削除
      const { error: profileError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userProfile.id)

      if (profileError) {
        console.error('プロフィール削除エラー:', profileError)
        results.push({ step: 'profile_delete', status: 'error', error: profileError.message })
      } else {
        results.push({ step: 'profile_delete', status: 'success' })
      }

      // 4. 認証ユーザーを削除
      if (userProfile.auth_user_id) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userProfile.auth_user_id)

        if (authError) {
          console.error('認証ユーザー削除エラー:', authError)
          results.push({ step: 'auth_delete', status: 'error', error: authError.message })
        } else {
          results.push({ step: 'auth_delete', status: 'success' })
        }
      }
    } else {
      // プロフィールが見つからない場合、認証ユーザーのみ削除を試行
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      const authUser = authUsers.users.find(u => u.email === email)

      if (authUser) {
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(authUser.id)

        if (authError) {
          console.error('認証ユーザー削除エラー:', authError)
          results.push({ step: 'auth_delete_only', status: 'error', error: authError.message })
        } else {
          results.push({ step: 'auth_delete_only', status: 'success' })
        }
      } else {
        results.push({ step: 'user_not_found', status: 'info', message: 'ユーザーが見つかりませんでした' })
      }
    }

    const hasErrors = results.some(r => r.status === 'error')
    const message = hasErrors ? 'ユーザー削除中にエラーが発生しました' : 'ユーザーを正常に削除しました'

    return NextResponse.json({
      message,
      email,
      results,
      success: !hasErrors
    }, { status: hasErrors ? 500 : 200 })

  } catch (error) {
    console.error('delete-specific-user API: エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
