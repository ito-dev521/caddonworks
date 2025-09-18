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

// ユーザー一覧取得
export async function GET(request: NextRequest) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    console.log('認証ユーザーID:', user.id)

    // メンバーシップから直接情報を取得（発注者の場合）
    const { data: userMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id, user_id')
      .eq('user_id', user.id)

    console.log('メンバーシップ取得結果:', { 
      userMemberships, 
      membershipError,
      queryUserId: user.id,
      membershipsCount: userMemberships?.length || 0
    })

    if (membershipError) {
      console.log('メンバーシップ取得エラー:', membershipError)
      return NextResponse.json({ message: 'メンバーシップの取得に失敗しました' }, { status: 500 })
    }

    if (!userMemberships || userMemberships.length === 0) {
      console.log('メンバーシップが見つからない - 空の結果')
      return NextResponse.json({ message: 'メンバーシップが見つかりません' }, { status: 403 })
    }

    // OrgAdmin権限をチェック
    const orgMembership = userMemberships.find(m => m.role === 'OrgAdmin')
    if (!orgMembership) {
      console.log('OrgAdmin権限がない')
      return NextResponse.json({ message: 'この操作を実行する権限がありません（発注者権限が必要です）' }, { status: 403 })
    }

    const orgId = orgMembership.org_id

    // 組織のメンバーシップ一覧を取得
    const { data: orgMemberships, error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        role,
        created_at
      `)
      .eq('org_id', orgId)

    if (membershipsError) {
      console.error('メンバーシップ取得エラー:', membershipsError)
      return NextResponse.json({ message: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
    }

    // 空のリストの場合は正常なレスポンスを返す
    if (!orgMemberships || orgMemberships.length === 0) {
      return NextResponse.json({ users: [] }, { status: 200 })
    }

    // 各ユーザーの詳細情報を取得
    const userIds = orgMemberships?.map(m => m.user_id) || []
    let userDetailsMap: any = {}

    if (userIds.length > 0) {
      // 一般ユーザー（Contractor）のプロフィールを取得
      const { data: contractorProfiles } = await supabaseAdmin
        .from('users')
        .select('id, email, display_name, formal_name, created_at, updated_at')
        .in('id', userIds)

      // 認証ユーザー情報を取得（発注者用）
      const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
      
      userDetailsMap = userIds.reduce((acc: any, userId: string) => {
        // 一般ユーザーのプロフィールがあるかチェック
        const contractorProfile = contractorProfiles?.find(p => p.id === userId)
        if (contractorProfile) {
          acc[userId] = contractorProfile
        } else {
          // 発注者の場合は認証ユーザー情報を使用
          const authUser = authUsers?.users?.find(u => u.id === userId)
          if (authUser) {
            acc[userId] = {
              id: userId,
              email: authUser.email || '',
              display_name: authUser.email?.split('@')[0] || '管理者',
              formal_name: null,
              created_at: authUser.created_at,
              updated_at: authUser.updated_at
            }
          }
        }
        return acc
      }, {})
    }

    // データを整形
    const formattedUsers = orgMemberships?.map(membership => {
      const userDetails = userDetailsMap[membership.user_id]
      return {
        id: membership.user_id,
        email: userDetails?.email || '',
        display_name: userDetails?.display_name || '未設定',
        formal_name: userDetails?.formal_name,
        role: membership.role,
        created_at: membership.created_at,
        updated_at: userDetails?.updated_at || membership.created_at,
        is_active: true
      }
    }) || []

    return NextResponse.json({ users: formattedUsers }, { status: 200 })

  } catch (error) {
    console.error('ユーザー一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// 新規ユーザー作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, display_name, formal_name, role } = body

    if (!email || !display_name) {
      return NextResponse.json({ message: '必須項目が入力されていません' }, { status: 400 })
    }

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // OrgAdmin権限をチェック
    const { data: userMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !userMemberships || !userMemberships.some(m => m.role === 'OrgAdmin')) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません（発注者権限が必要です）' }, { status: 403 })
    }

    const orgId = userMemberships.find(m => m.role === 'OrgAdmin')?.org_id

    // ドメインチェック
    const currentUserDomain = userProfile.email.split('@')[1]
    const newUserDomain = email.split('@')[1]
    if (currentUserDomain !== newUserDomain) {
      return NextResponse.json({ message: `メールアドレスは ${currentUserDomain} ドメインである必要があります` }, { status: 400 })
    }

    // パスワード生成
    const password = generatePassword()

    // Supabase Authでユーザー作成
    const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (authCreateError) {
      console.error('認証ユーザー作成エラー:', authCreateError)
      return NextResponse.json({ message: 'ユーザー作成に失敗しました' }, { status: 500 })
    }

    // ユーザープロフィール作成（全ユーザー）
    const { error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUser.user.id,
        email,
        display_name,
        formal_name
      })

    if (profileError) {
      console.error('プロフィール作成エラー:', profileError)
      // 認証ユーザーを削除
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ message: 'ユーザープロフィールの作成に失敗しました' }, { status: 500 })
    }

    // メンバーシップ作成
    const { error: membershipCreateError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: authUser.user.id,
        org_id: orgId,
        role
      })

    if (membershipCreateError) {
      console.error('メンバーシップ作成エラー:', membershipCreateError)
      // ユーザーとプロフィールを削除
      await supabaseAdmin.from('users').delete().eq('auth_user_id', authUser.user.id)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ message: 'メンバーシップの作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'ユーザーが正常に作成されました',
      password: password
    }, { status: 201 })

  } catch (error) {
    console.error('ユーザー作成APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// ユーザー更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, display_name, formal_name } = body

    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // OrgAdmin権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || !memberships.some(m => m.role === 'OrgAdmin')) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません（発注者権限が必要です）' }, { status: 403 })
    }

    // ユーザー情報を更新
    const updateData: any = {
      display_name,
      formal_name
    }

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)

    if (updateError) {
      console.error('ユーザー更新エラー:', updateError)
      return NextResponse.json({ message: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: 'ユーザー情報が正常に更新されました' }, { status: 200 })

  } catch (error) {
    console.error('ユーザー更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// ユーザー削除
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, org_id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // OrgAdmin権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || !memberships.some(m => m.role === 'OrgAdmin')) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません（発注者権限が必要です）' }, { status: 403 })
    }

    // 自分自身は削除できない
    if (userId === userProfile.id) {
      return NextResponse.json({ message: '自分自身を削除することはできません' }, { status: 400 })
    }

    // ユーザーのauth_user_idを取得
    const { data: targetUser, error: targetUserError } = await supabaseAdmin
      .from('users')
      .select('auth_user_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ message: '削除対象のユーザーが見つかりません' }, { status: 404 })
    }

    const authUserId = targetUser.auth_user_id

    // メンバーシップを削除
    const { error: membershipDeleteError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', userId)

    if (membershipDeleteError) {
      console.error('メンバーシップ削除エラー:', membershipDeleteError)
      return NextResponse.json({ message: 'メンバーシップの削除に失敗しました' }, { status: 500 })
    }

    // ユーザープロフィールを削除
    const { error: profileDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', userId)

    if (profileDeleteError) {
      console.error('プロフィール削除エラー:', profileDeleteError)
      return NextResponse.json({ message: 'ユーザープロフィールの削除に失敗しました' }, { status: 500 })
    }

    // 認証ユーザーを削除
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(authUserId)

    if (authDeleteError) {
      console.error('認証ユーザー削除エラー:', authDeleteError)
      return NextResponse.json({ message: '認証ユーザーの削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: 'ユーザーが正常に削除されました' }, { status: 200 })

  } catch (error) {
    console.error('ユーザー削除APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
