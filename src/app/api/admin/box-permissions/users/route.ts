export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }

    // 管理者メールアドレスチェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    if (!adminEmails.includes(user.email!)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 全ユーザーを取得（メンバーシップとBox権限設定も含む）
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        name,
        email,
        role,
        memberships (
          organizations (
            name
          )
        ),
        box_emergency_stops (
          is_stopped
        )
      `)
      .order('name')

    if (usersError) {
      console.error('Users fetch error:', usersError)
      return NextResponse.json({ error: 'ユーザー取得エラー', details: usersError }, { status: 500 })
    }

    // データを整形
    const formattedUsers = users?.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      organization: user.memberships?.[0]?.organizations?.name || '所属なし',
      isEmergencyStopped: user.box_emergency_stops?.[0]?.is_stopped || false
    })) || []

    return NextResponse.json({
      success: true,
      users: formattedUsers
    })

  } catch (error: any) {
    console.error('❌ Box permissions users API error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}