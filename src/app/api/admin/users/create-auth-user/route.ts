import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 管理者がusersテーブルのユーザーに対してauth.usersエントリを作成するAPI
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // Admin 権限判定
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())

    const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())
    let isMembershipAdmin = false
    const candidates = [userProfile?.id, user.id].filter(Boolean) as string[]
    for (const candidate of candidates) {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', candidate)
        .eq('role', 'Admin')
        .maybeSingle()
      if (membership) { isMembershipAdmin = true; break }
    }

    if (!isEmailAdmin && !isMembershipAdmin) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 入力
    const body = await request.json()
    const { userId, temporaryPassword } = body as { userId?: string; temporaryPassword?: string }

    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

    if (!temporaryPassword) {
      return NextResponse.json({ message: '仮パスワードが必要です' }, { status: 400 })
    }

    // パスワードの長さチェック（Supabaseは最低6文字必要）
    if (temporaryPassword.length < 6) {
      return NextResponse.json({ message: 'パスワードは6文字以上で指定してください' }, { status: 400 })
    }

    // 対象ユーザーを取得
    console.log('🔍 認証ユーザー作成: ユーザーID検索:', { userId })
    const { data: targetUser, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, auth_user_id, display_name')
      .eq('id', userId)
      .single()

    console.log('🔍 ユーザー取得結果:', {
      targetUser,
      userErr,
      errorCode: userErr?.code,
      errorMessage: userErr?.message,
      errorDetails: userErr?.details
    })

    if (userErr || !targetUser) {
      console.error('❌ 対象ユーザーが見つかりません:', { userId, userErr })
      return NextResponse.json({
        message: '対象ユーザーが見つかりません',
        details: userErr?.message,
        userId
      }, { status: 404 })
    }

    if (!targetUser.email) {
      return NextResponse.json({ message: 'ユーザーのメールアドレスが設定されていません' }, { status: 400 })
    }

    // 既にauth_user_idが設定されている場合は確認
    if (targetUser.auth_user_id) {
      console.log('🔍 既存のauth_user_idを確認:', { auth_user_id: targetUser.auth_user_id })
      const { data: existingAuthUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(targetUser.auth_user_id)

      console.log('🔍 auth.getUserById結果:', {
        hasUser: !!existingAuthUser?.user,
        userEmail: existingAuthUser?.user?.email,
        emailConfirmed: existingAuthUser?.user?.email_confirmed_at,
        banned: existingAuthUser?.user?.banned_until,
        getUserError
      })

      if (existingAuthUser && existingAuthUser.user) {
        // メールアドレスが確認されているかチェック
        const isEmailConfirmed = !!existingAuthUser.user.email_confirmed_at

        if (!isEmailConfirmed) {
          console.warn('⚠️ 認証ユーザーは存在するが、メールアドレスが未確認です')
          // メールアドレスを確認済みにする
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            targetUser.auth_user_id,
            { email_confirm: true }
          )

          if (updateError) {
            console.error('メール確認フラグ更新エラー:', updateError)
          } else {
            console.log('✅ メール確認フラグを更新しました')
          }
        }

        return NextResponse.json({
          message: 'このユーザーは既に認証システムに登録されています',
          authUserId: targetUser.auth_user_id,
          authEmail: existingAuthUser.user.email,
          emailConfirmed: isEmailConfirmed
        }, { status: 400 })
      }

      // auth_user_idが設定されているが、実際には存在しない場合はクリア
      if (!existingAuthUser?.user) {
        console.warn('⚠️ 無効なauth_user_idが設定されています。クリアして続行します:', {
          userId: targetUser.id,
          invalidAuthUserId: targetUser.auth_user_id
        })

        // 無効なauth_user_idをクリア
        const { error: clearError } = await supabaseAdmin
          .from('users')
          .update({ auth_user_id: null })
          .eq('id', userId)

        if (clearError) {
          console.error('auth_user_idクリアエラー:', clearError)
        } else {
          console.log('✅ 無効なauth_user_idをクリアしました')
        }

        // 更新されたデータでtargetUserを再取得
        (targetUser as any).auth_user_id = null
      }
    }

    // auth.usersにメールアドレスが既に存在するか確認
    const { data: { users: existingUsers }, error: listError } = await supabaseAdmin.auth.admin.listUsers()

    if (listError) {
      console.error('ユーザーリスト取得エラー:', listError)
      return NextResponse.json({ message: 'ユーザー確認に失敗しました' }, { status: 500 })
    }

    const emailExists = existingUsers?.some(u => u.email?.toLowerCase() === targetUser.email.toLowerCase())
    if (emailExists) {
      return NextResponse.json({
        message: `メールアドレス "${targetUser.email}" は既に認証システムに登録されています。別のユーザーが使用している可能性があります。`
      }, { status: 400 })
    }

    // 新しい認証ユーザーを作成
    const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: targetUser.email,
      password: temporaryPassword,
      email_confirm: true, // メール確認を自動的に完了
      user_metadata: {
        name: (targetUser as any).display_name || '',
        created_by_admin: true,
        created_at: new Date().toISOString()
      }
    })

    if (createError || !newAuthUser.user) {
      console.error('認証ユーザー作成エラー:', createError)
      return NextResponse.json({
        message: '認証ユーザーの作成に失敗しました',
        error: createError?.message
      }, { status: 500 })
    }

    // usersテーブルのauth_user_idを更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ auth_user_id: newAuthUser.user.id })
      .eq('id', userId)

    if (updateError) {
      console.error('auth_user_id更新エラー:', updateError)
      // 作成した認証ユーザーを削除（ロールバック）
      await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id)
      return NextResponse.json({
        message: 'ユーザーテーブルの更新に失敗しました',
        error: updateError.message
      }, { status: 500 })
    }

    console.log('✅ 認証ユーザー作成完了:', {
      userId: targetUser.id,
      email: targetUser.email,
      authUserId: newAuthUser.user.id
    })

    return NextResponse.json({
      message: '認証ユーザーを作成しました',
      authUserId: newAuthUser.user.id,
      email: targetUser.email
    }, { status: 200 })

  } catch (error) {
    console.error('create-auth-user API エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
