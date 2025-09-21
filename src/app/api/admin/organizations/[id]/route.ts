import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id
    const { active } = await request.json()

    if (typeof active !== 'boolean') {
      return NextResponse.json({ message: 'activeフィールドが必要です' }, { status: 400 })
    }

    // 認証ヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者権限チェック（role='Admin'のユーザーのみ）
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile || userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 組織を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('approval_status')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織が見つかりません' }, { status: 404 })
    }

    // 承認済みの組織のみ有効化・無効化可能
    if (organization.approval_status !== 'approved') {
      return NextResponse.json({ message: '承認済みの組織のみ有効化・無効化できます' }, { status: 400 })
    }

    // 組織のactive状態を更新
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ active })
      .eq('id', organizationId)

    if (updateError) {
      return NextResponse.json({
        message: '組織更新に失敗しました',
        error: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: active ? '組織が有効化されました' : '組織が無効化されました'
    }, { status: 200 })

  } catch (error) {
    console.error('組織更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}