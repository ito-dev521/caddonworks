import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// email で特定したユーザーの全メンバーシップを Staff に統一する
// POST body: { email: string, name?: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = body?.email as string
    const name = body?.name as string | undefined
    if (!email) return NextResponse.json({ message: 'email は必須です' }, { status: 400 })

    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (userErr || !user) return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 })

    // すべての memberships を Staff に更新
    const { error: upErr } = await supabaseAdmin
      .from('memberships')
      .update({ role: 'Staff' })
      .eq('user_id', user.id)

    if (upErr) return NextResponse.json({ message: 'ロール更新に失敗しました', error: upErr.message }, { status: 500 })

    if (name) {
      await supabaseAdmin.from('users').update({ display_name: name, formal_name: name }).eq('id', user.id)
    }

    return NextResponse.json({ message: 'すべてのメンバーシップを Staff に更新しました' }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ message: 'サーバーエラー: ' + (e?.message || 'unknown') }, { status: 500 })
  }
}


