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

// ユーザーのデバッグ情報を取得
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { message: 'メールアドレスが必要です' },
        { status: 400 }
      )
    }

    console.log('デバッグ対象メール:', email)

    // 1. Supabase Authでユーザーを検索
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    if (authError) {
      console.error('Auth users list error:', authError)
      return NextResponse.json(
        { message: '認証ユーザー一覧の取得に失敗しました' },
        { status: 500 }
      )
    }

    const authUser = authUsers.users.find(u => u.email === email)
    console.log('Supabase Authユーザー:', authUser ? {
      id: authUser.id,
      email: authUser.email,
      email_confirmed_at: authUser.email_confirmed_at,
      created_at: authUser.created_at
    } : 'Not found')

    // 2. usersテーブルでプロフィールを検索
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    console.log('ユーザープロフィール:', userProfile || 'Not found')
    if (profileError) {
      console.log('プロフィールエラー:', profileError)
    }

    // auth_user_idでも検索
    let userProfileByAuthId = null
    if (authUser) {
      const { data: profileByAuth, error: profileByAuthError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      userProfileByAuthId = profileByAuth
      console.log('auth_user_idによるプロフィール:', profileByAuth || 'Not found')
      if (profileByAuthError) {
        console.log('auth_user_idプロフィールエラー:', profileByAuthError)
      }
    }

    // 3. メンバーシップを検索
    const profileToCheck = userProfile || userProfileByAuthId
    let memberships = null
    if (profileToCheck) {
      const { data: membershipData, error: membershipError } = await supabaseAdmin
        .from('memberships')
        .select(`
          *,
          organizations (
            id,
            name,
            active,
            approval_status
          )
        `)
        .eq('user_id', profileToCheck.id)

      memberships = membershipData
      console.log('メンバーシップ:', memberships || 'Not found')
      if (membershipError) {
        console.log('メンバーシップエラー:', membershipError)
      }
    }

    // 4. 組織の状態を確認
    let organizationStatus = null
    if (memberships && memberships.length > 0) {
      for (const membership of memberships) {
        const org = membership.organizations as any
        if (org) {
          console.log(`組織 ${org.name}:`, {
            active: org.active,
            approval_status: org.approval_status
          })
        }
      }
    }

    return NextResponse.json({
      email: email,
      auth_user: authUser ? {
        id: authUser.id,
        email: authUser.email,
        email_confirmed_at: authUser.email_confirmed_at,
        created_at: authUser.created_at
      } : null,
      user_profile: userProfile,
      user_profile_by_auth_id: userProfileByAuthId,
      memberships: memberships,
      debug_info: {
        auth_user_exists: !!authUser,
        profile_exists: !!userProfile,
        profile_by_auth_exists: !!userProfileByAuthId,
        memberships_count: memberships ? memberships.length : 0,
        organizations: memberships ? memberships.map((m: any) => ({
          name: m.organizations?.name,
          active: m.organizations?.active,
          approval_status: m.organizations?.approval_status
        })) : []
      }
    }, { status: 200 })

  } catch (error) {
    console.error('ユーザーデバッグエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}