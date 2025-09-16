import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    console.log('通知テストAPI: 開始')

    // 1. notificationsテーブルの存在確認
    const { data: tableExists, error: tableError } = await supabaseAdmin
      .from('notifications')
      .select('id')
      .limit(1)

    if (tableError) {
      console.error('notificationsテーブルエラー:', tableError)
      return NextResponse.json({
        success: false,
        error: 'notificationsテーブルが存在しません',
        details: tableError.message
      }, { status: 500 })
    }

    // 2. 既存の通知数を取得
    const { count: notificationCount, error: countError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      console.error('通知数取得エラー:', countError)
    }

    // 3. 最近の通知を取得
    const { data: recentNotifications, error: recentError } = await supabaseAdmin
      .from('notifications')
      .select(`
        id,
        user_id,
        type,
        title,
        message,
        read_at,
        created_at,
        users!notifications_user_id_fkey (
          display_name,
          email
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    if (recentError) {
      console.error('最近の通知取得エラー:', recentError)
    }

    // 4. OrgAdminユーザーを取得
    const { data: orgAdmins, error: orgAdminsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        role,
        users!memberships_user_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('role', 'OrgAdmin')
      .limit(5)

    if (orgAdminsError) {
      console.error('OrgAdmin取得エラー:', orgAdminsError)
    }

    return NextResponse.json({
      success: true,
      data: {
        tableExists: true,
        notificationCount: notificationCount || 0,
        recentNotifications: recentNotifications || [],
        orgAdmins: orgAdmins || [],
        errors: {
          tableError: (tableError as any)?.message || null,
          countError: (countError as any)?.message || null,
          recentError: (recentError as any)?.message || null,
          orgAdminsError: (orgAdminsError as any)?.message || null
        }
      }
    })

  } catch (error) {
    console.error('通知テストAPIエラー:', error)
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('通知テスト作成API: 開始')

    const body = await request.json()
    const { user_id, type = 'bid_received', title, message, data = {} } = body

    if (!user_id || !title || !message) {
      return NextResponse.json({
        success: false,
        error: 'user_id, title, messageは必須です'
      }, { status: 400 })
    }

    // テスト通知を作成
    const { data: notification, error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id,
        type,
        title,
        message,
        data
      })
      .select()
      .single()

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
      return NextResponse.json({
        success: false,
        error: '通知の作成に失敗しました',
        details: notificationError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notification
    })

  } catch (error) {
    console.error('通知テスト作成APIエラー:', error)
    return NextResponse.json({
      success: false,
      error: 'サーバーエラーが発生しました',
      details: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 })
  }
}
