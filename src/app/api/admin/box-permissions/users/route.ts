export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    console.log('📥 Box permissions users API called')

    // 管理者権限チェック
    const authHeader = request.headers.get('authorization')
    console.log('🔑 Auth header present:', !!authHeader)

    if (!authHeader) {
      console.log('❌ No auth header provided')
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    console.log('👤 User auth check:', { user: user?.email, error: authError?.message })

    if (authError || !user) {
      console.log('❌ Auth error or no user')
      return NextResponse.json({ error: '認証エラー', details: authError?.message }, { status: 401 })
    }

    // 管理者メールアドレスチェック
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    console.log('🔧 Admin emails configured:', adminEmails.length > 0)
    console.log('📧 User email:', user.email)
    console.log('✅ Is admin:', adminEmails.includes(user.email!))

    if (!adminEmails.includes(user.email!)) {
      console.log('❌ User is not admin')
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('📊 Fetching users from database...')

    // まず基本的なユーザー情報のみを取得して、Box関連テーブルの存在を確認
    let users;
    let usersError;

    try {
      // 基本的なユーザー情報を取得
      const basicUsersQuery = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .order('display_name')

      users = basicUsersQuery.data
      usersError = basicUsersQuery.error

      console.log('🔍 Basic users query result:', {
        usersCount: users?.length || 0,
        error: usersError?.message
      })

      if (usersError) {
        throw new Error(`Basic users query failed: ${usersError.message}`)
      }

      // Box関連テーブルが存在するか確認
      if (users && users.length > 0) {
        const testUserId = users[0].id

        // box_emergency_stops テーブルの存在確認
        const { data: emergencyTest, error: emergencyError } = await supabaseAdmin
          .from('box_emergency_stops')
          .select('is_stopped')
          .eq('user_id', testUserId)
          .limit(1)

        console.log('📦 Box emergency stops table test:', {
          exists: !emergencyError,
          error: emergencyError?.message
        })
      }

    } catch (error) {
      console.error('❌ Database query error:', error)
      throw error
    }

    if (usersError) {
      console.error('❌ Users fetch error:', usersError)
      return NextResponse.json({ error: 'ユーザー取得エラー', details: usersError }, { status: 500 })
    }

    // データを整形（Box関連情報は後で追加予定）
    const formattedUsers = users?.map(user => ({
      id: user.id,
      name: user.display_name || user.email || 'Unknown User',
      email: user.email,
      role: 'contractor', // デフォルトで contractor として扱う
      organization: (user as any).organization || '所属なし',
      isEmergencyStopped: false // box_emergency_stops テーブル参照は後で実装
    })) || []

    console.log('✅ Formatted users:', formattedUsers.length)

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