import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      displayName,
      specialties,
      qualifications,
      portfolioUrl
    } = body

    // バリデーション
    if (!email || !password || !displayName) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '正しいメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // 既存のユーザーをチェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // 1. Supabase Authでユーザーを作成
    const isDevelopment = process.env.NODE_ENV === 'development'
    
    let authData, authError
    
    if (isDevelopment) {
      // 開発環境：Supabaseのメール設定問題を回避するため、admin APIを使用
      const { createSupabaseAdmin } = await import('@/lib/supabase')
      const supabaseAdmin = createSupabaseAdmin()
      
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // 開発環境では自動確認
        user_metadata: {
          display_name: displayName,
          role: 'Contractor'
        }
      })
      
      authData = result.data
      authError = result.error
    } else {
      // 本番環境：通常のサインアップ（メール認証必須）
      const result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            role: 'Contractor'
          },
          emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/login?verified=true`
        }
      })
      
      authData = result.data
      authError = result.error
    }

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { message: 'ユーザー作成に失敗しました: ' + authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'ユーザー作成に失敗しました' },
        { status: 400 }
      )
    }

    // 2. ユーザープロフィールを作成
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email,
        display_name: displayName,
        specialties: specialties || [],
        qualifications: qualifications || [],
        portfolio_url: portfolioUrl || null
      })
      .select()
      .single()

    if (userError) {
      console.error('User profile creation error:', userError)
      // Authユーザーを削除（ロールバック）
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: 'ユーザープロフィール作成に失敗しました: ' + userError.message },
        { status: 400 }
      )
    }

    // 3. 受注者としてのメンバーシップを作成
    // 受注者は特定の組織に所属しないため、org_idはnull
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: null,
        user_id: userData.id,
        role: 'Contractor'
      })

    if (membershipError) {
      console.error('Membership creation error:', membershipError)
      // ユーザーとAuthユーザーを削除（ロールバック）
      await supabase.from('users').delete().eq('id', userData.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: '権限設定に失敗しました: ' + membershipError.message },
        { status: 400 }
      )
    }

    // カスタムウェルカムメールを送信
    try {
      if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
        const { sendContractorWelcomeEmail } = await import('@/lib/mailgun')
        const loginUrl = `${process.env.NEXTAUTH_URL}/auth/login`
        await sendContractorWelcomeEmail({
          email,
          displayName,
          password,
          loginUrl
        })
      } else {
        console.log('Mailgun not configured, skipping welcome email')
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // メール送信失敗はログに記録するが、登録処理は成功として扱う
    }

    // 成功レスポンス
    const successMessage = isDevelopment 
      ? '受注者登録が完了しました。開発環境のため、すぐにログインできます。'
      : '受注者登録が完了しました。メールアドレスに認証リンクを送信しました。メール内のリンクをクリックして認証を完了してからログインしてください。'
    
    return NextResponse.json({
      message: successMessage,
      data: {
        userId: userData.id,
        authUserId: authData.user.id,
        emailConfirmationRequired: !isDevelopment
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Contractor registration error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
