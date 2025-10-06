import { NextRequest, NextResponse } from 'next/server'
import { supabase, createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      // Organization Info
      organizationName,
      organizationType,
      businessType,
      taxId,
      registrationNumber,
      postalCode,
      address1,
      address2,
      address,
      phone,
      billingEmail,
      website,

      // Admin User Info
      adminName,
      adminEmail,
      adminPassword,
      adminPhone,
      adminDepartment,

      // Billing Info
      systemFee,

      // Agreement
      agreedToTerms,
      agreedToPrivacy
    } = body

    // バリデーション
    if (!organizationName || !adminName || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // 利用規約同意チェック
    if (!agreedToTerms || !agreedToPrivacy) {
      return NextResponse.json(
        { message: '利用規約とプライバシーポリシーへの同意が必要です' },
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

    // 1. Supabase Authでユーザーを作成（管理者権限で確認メールなし）
    const supabaseAdmin = createSupabaseAdmin()
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true, // メール確認を自動的に完了状態にする
      user_metadata: {
        display_name: adminName,
        role: 'OrgAdmin'
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

    // 住所の組み立て（address1とaddress2が提供されている場合）
    let fullAddress = address
    if (address1 || address2) {
      const addressParts = []
      if (postalCode) addressParts.push(`〒${postalCode}`)
      if (address1) addressParts.push(address1)
      if (address2) addressParts.push(address2)
      fullAddress = addressParts.join(' ')
    }

    // 2. 組織を作成（承認待ち状態で作成）
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name: organizationName,
        address: fullAddress || null,
        phone: phone || null,
        website: website || null,
        billing_email: billingEmail || adminEmail,
        system_fee: systemFee || 50000,
        active: false,
        approval_status: 'pending',
        business_type: businessType || organizationType || 'private_corp',
        registration_number: taxId || registrationNumber || null
      })
      .select()
      .single()

    if (orgError) {
      console.error('Organization creation error:', orgError)
      // Authユーザーを削除（ロールバック）
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
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
        formal_name: adminName,
        phone_number: adminPhone || null,
        department: adminDepartment || null,
        specialties: [],
        qualifications: []
      })
      .select()
      .single()

    if (userError) {
      console.error('User profile creation error:', userError)
      // 組織とAuthユーザーを削除（ロールバック）
      await supabase.from('organizations').delete().eq('id', orgData.id)
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
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
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { message: '権限設定に失敗しました: ' + membershipError.message },
        { status: 400 }
      )
    }

    // 5. 会社用BOXフォルダの作成は管理者による承認後に実行されるため、ここでは作成しない
    // （承認時に /api/admin/organizations/[id]/approval で自動作成される）

    // 6. 発注者用申請受付メールを送信
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/send-organization-application-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: organizationName,
          adminName: adminName,
          adminEmail: adminEmail
        })
      })

      if (!emailResponse.ok) {
        console.warn('申請受付メールの送信に失敗しましたが、登録は完了しました')
      } else {
        console.log('組織申請受付メールを送信しました')
      }
    } catch (emailError) {
      console.warn('申請受付メール送信でエラーが発生しましたが、登録は完了しました:', emailError)
    }

    // 成功レスポンス（承認待ち状態）
    return NextResponse.json({
      message: '組織登録申請が完了しました。運営者による承認をお待ちください。',
      data: {
        organizationId: orgData.id,
        userId: userData.id,
        authUserId: authData.user.id,
        approval_status: 'pending'
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
