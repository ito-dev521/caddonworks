import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// GET: 取得（support_fee_percent など）
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    // 認証: Admin ロールのみ
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!me) return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 403 })

    const { data: memberships } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', me.id)

    const isAdmin = (memberships || []).some(m => m.role === 'Admin')
    if (!isAdmin) return NextResponse.json({ message: '権限がありません' }, { status: 403 })

    const { data: settings } = await supabase
      .from('system_settings')
      .select('*')
      .eq('id', 'global')
      .maybeSingle()

    return NextResponse.json({ settings: settings || { id: 'global', support_fee_percent: 8 } }, { status: 200 })
  } catch (error) {
    console.error('Admin settings GET error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// PUT: 更新（support_fee_percent）
export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!me) return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 403 })

    const { data: memberships } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', me.id)
    const isAdmin = (memberships || []).some(m => m.role === 'Admin')
    if (!isAdmin) return NextResponse.json({ message: '権限がありません' }, { status: 403 })

    const body = await request.json()
    const { support_fee_percent } = body
    const percent = Number(support_fee_percent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json({ message: 'support_fee_percent は 0〜100 の数値で指定してください' }, { status: 400 })
    }

    const { data: updated, error: upErr } = await supabase
      .from('system_settings')
      .upsert({ id: 'global', support_fee_percent: Math.round(percent) }, { onConflict: 'id' })
      .select('*')
      .single()

    if (upErr) return NextResponse.json({ message: '更新に失敗しました' }, { status: 500 })
    return NextResponse.json({ settings: updated }, { status: 200 })
  } catch (error) {
    console.error('Admin settings PUT error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}




