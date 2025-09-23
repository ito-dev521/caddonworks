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

// 不完全なユーザーを修復
export async function POST(request: NextRequest) {
  try {
    const { email, display_name, org_id, role = 'Staff' } = await request.json()

    if (!email || !display_name || !org_id) {
      return NextResponse.json(
        { message: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    console.log('ユーザー修復開始:', { email, display_name, org_id, role })

    // 1. Supabase Authにユーザーが存在するかチェック
    const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json(
        { message: 'ユーザー一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    const existingAuthUser = authUsers.users.find(u => u.email === email)
    console.log('既存のAuthユーザー:', existingAuthUser ? 'あり' : 'なし')

    // 2. usersテーブルのデータをチェック
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    console.log('既存のプロフィール:', existingProfile ? 'あり' : 'なし')

    // 3. Authユーザーが存在しない場合は作成
    let authUserId = existingAuthUser?.id
    if (!existingAuthUser) {
      const password = generatePassword()
      console.log('新しいAuthユーザーを作成中...')

      const { data: newAuthUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name,
          role
        }
      })

      if (authError) {
        console.error('Authユーザー作成エラー:', authError)
        return NextResponse.json(
          { message: 'Authユーザーの作成に失敗しました: ' + authError.message },
          { status: 500 }
        )
      }

      authUserId = newAuthUser.user.id
      console.log('新しいAuthユーザー作成完了:', authUserId)
    }

    // 4. プロフィールが存在しない場合は作成、存在する場合は更新
    let userProfile
    if (!existingProfile) {
      console.log('新しいプロフィールを作成中...')
      const { data: newProfile, error: createProfileError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          display_name,
          formal_name: display_name
        })
        .select()
        .single()

      if (createProfileError) {
        console.error('プロフィール作成エラー:', createProfileError)
        return NextResponse.json(
          { message: 'プロフィールの作成に失敗しました: ' + createProfileError.message },
          { status: 500 }
        )
      }

      userProfile = newProfile
    } else {
      console.log('既存のプロフィールを更新中...')
      const { data: updatedProfile, error: updateProfileError } = await supabaseAdmin
        .from('users')
        .update({
          auth_user_id: authUserId,
          display_name,
          formal_name: display_name
        })
        .eq('id', existingProfile.id)
        .select()
        .single()

      if (updateProfileError) {
        console.error('プロフィール更新エラー:', updateProfileError)
        return NextResponse.json(
          { message: 'プロフィールの更新に失敗しました: ' + updateProfileError.message },
          { status: 500 }
        )
      }

      userProfile = updatedProfile
    }

    // 5. メンバーシップをチェック・作成
    const { data: existingMembership, error: membershipCheckError } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('user_id', userProfile.id)
      .eq('org_id', org_id)
      .single()

    console.log('既存メンバーシップチェック:', existingMembership, membershipCheckError)

    if (!existingMembership) {
      console.log('新しいメンバーシップを作成中...')
      const { error: membershipCreateError } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: userProfile.id,
          org_id: org_id,
          role: role
        })

      if (membershipCreateError) {
        console.error('メンバーシップ作成エラー:', membershipCreateError)
        return NextResponse.json(
          { message: 'メンバーシップの作成に失敗しました: ' + membershipCreateError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'ユーザーが正常に修復されました',
      user: {
        auth_user_id: authUserId,
        profile_id: userProfile.id,
        email: email,
        display_name: display_name
      }
    }, { status: 200 })

  } catch (error) {
    console.error('ユーザー修復エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}