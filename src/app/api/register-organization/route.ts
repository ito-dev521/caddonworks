import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      // Organization Info
      organizationName,
      organizationType,
      taxId,
      address,
      phone,
      billingEmail,
      website,
      description,
      
      // Admin User Info
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
      adminDepartment,
      
      // Billing Info
      systemFee,
      paymentMethod,
      billingAddress
    } = body

    // バリデーション
    if (!organizationName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { message: '正しいメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // 既存のユーザーをチェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', adminEmail)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { message: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      )
    }

    // 既存の組織をチェック
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('id')
      .eq('name', organizationName)
      .single()

    if (existingOrg) {
      return NextResponse.json(
        { message: 'この組織名は既に登録されています' },
        { status: 400 }
      )
    }

    // 1. Supabase Authでユーザーを作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: adminEmail,
      password: adminPassword,
      options: {
        data: {
          display_name: adminName,
          role: 'OrgAdmin'
        }
      }
    })

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

    // 2. 組織を作成
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        description: description || null,
        billing_email: billingEmail || adminEmail,
        system_fee: systemFee || 50000,
        active: true
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      // Authユーザーを削除（ロールバック）
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: '組織作成に失敗しました: ' + orgError.message },
        { status: 400 }
      )
    }

    // 3. ユーザープロフィールを作成
    const { data: userData, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authData.user.id,
        email: adminEmail,
        display_name: adminName,
        specialties: [],
        qualifications: []
      })
      .select()
      .single()

    if (userError) {
      console.error('User profile creation error:', userError)
      // 組織とAuthユーザーを削除（ロールバック）
      await supabase.from('organizations').delete().eq('id', orgData.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: 'ユーザープロフィール作成に失敗しました: ' + userError.message },
        { status: 400 }
      )
    }

    // 4. メンバーシップを作成（OrgAdmin権限）
    const { error: membershipError } = await supabase
      .from('memberships')
      .insert({
        org_id: orgData.id,
        user_id: userData.id,
        role: 'OrgAdmin'
      })

    if (membershipError) {
      console.error('Membership creation error:', membershipError)
      // ユーザー、組織、Authユーザーを削除（ロールバック）
      await supabase.from('users').delete().eq('id', userData.id)
      await supabase.from('organizations').delete().eq('id', orgData.id)
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: '権限設定に失敗しました: ' + membershipError.message },
        { status: 400 }
      )
    }

    // 成功レスポンス
    return NextResponse.json({
      message: '組織登録が完了しました',
      data: {
        organizationId: orgData.id,
        userId: userData.id,
        authUserId: authData.user.id
      }
    }, { status: 200 })

  } catch (error) {
    console.error('Organization registration error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error as Error).message },
      { status: 500 }
    )
  }
}
