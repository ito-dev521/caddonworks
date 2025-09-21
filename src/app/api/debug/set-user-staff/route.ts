import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 管理用: 指定ユーザーを指定組織の Staff に設定する（存在しなければ作成）
// POST body: { email: string; organizationName: string; name?: string; password?: string }
export async function POST(request: NextRequest) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    const body = await request.json().catch(() => ({}))
    const email = (body?.email as string) || 'sasaki@demo.com'
    const organizationName = (body?.organizationName as string) || 'デモ建設株式会社'
    const name = (body?.name as string) || undefined
    const password = (body?.password as string) || undefined

    // ユーザー取得
    let { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('email', email)
      .single()

    if (userError || !user) {
      // ユーザーが存在しなければ作成
      if (!password) {
        return NextResponse.json({ message: '新規作成には password が必要です' }, { status: 400 })
      }
      const { data: authUser, error: authErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (authErr) {
        return NextResponse.json({ message: '認証ユーザー作成に失敗しました', error: authErr.message }, { status: 500 })
      }

      const { data: created, error: profileErr } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: authUser.user.id,
          email,
          display_name: name || email.split('@')[0],
          formal_name: name || null
        })
        .select()
        .single()
      if (profileErr) {
        return NextResponse.json({ message: 'ユーザープロフィール作成に失敗しました' }, { status: 500 })
      }
      user = created
    }

    // 組織取得
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('name', organizationName)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ message: `組織が見つかりません: ${organizationName}` }, { status: 404 })
    }

    // 既存のメンバーシップ確認
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, role')
      .eq('user_id', user.id)
      .eq('org_id', org.id)
      .maybeSingle()

    if (membership) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from('memberships')
        .update({ role: 'Staff' })
        .eq('id', membership.id)
        .select()
        .single()
      if (updateError) {
        return NextResponse.json({ message: 'ロール更新に失敗しました' }, { status: 500 })
      }
      // 氏名/表示名の更新（任意）
      if (name) {
        await supabaseAdmin.from('users').update({ display_name: name, formal_name: name }).eq('id', user.id)
      }
      return NextResponse.json({ message: '既存メンバーをStaffに更新しました', membership: updated }, { status: 200 })
    }

    // 無ければ作成
    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('memberships')
      .insert({ user_id: user.id, org_id: org.id, role: 'Staff' })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ message: 'メンバーシップ作成に失敗しました' }, { status: 500 })
    }

    // 氏名/表示名の更新（任意）
    if (name) {
      await supabaseAdmin.from('users').update({ display_name: name, formal_name: name }).eq('id', user.id)
    }
    return NextResponse.json({ message: '新規にStaffとして登録しました', membership: inserted }, { status: 201 })

  } catch (error) {
    console.error('set-user-staff API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


