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
    console.log('notifications API: リクエスト開始')
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('notifications API: 認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // ユーザーの通知を取得
    const { data: notifications, error: notificationsError } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (notificationsError) {
      console.error('notifications API: 通知取得エラー:', notificationsError)
      return NextResponse.json(
        { message: '通知の取得に失敗しました' },
        { status: 400 }
      )
    }

    // 未読通知数を取得
    const { count: unreadCount, error: unreadError } = await supabaseAdmin
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userProfile.id)
      .is('read_at', null)

    if (unreadError) {
      console.error('notifications API: 未読数取得エラー:', unreadError)
    }

    console.log('notifications API: 通知取得成功', { 
      count: notifications?.length || 0, 
      unread: unreadCount || 0 
    })

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount: unreadCount || 0
    }, { status: 200 })

  } catch (error) {
    console.error('notifications API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { notificationId, action } = body

    if (!notificationId || !action) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    let updateData: any = {}

    if (action === 'mark_read') {
      updateData = { read_at: new Date().toISOString() }
    } else if (action === 'mark_unread') {
      updateData = { read_at: null }
    } else {
      return NextResponse.json(
        { message: '無効なアクションです' },
        { status: 400 }
      )
    }

    // 通知を更新
    const { data: updatedNotification, error: updateError } = await supabaseAdmin
      .from('notifications')
      .update(updateData)
      .eq('id', notificationId)
      .eq('user_id', userProfile.id)
      .select()
      .single()

    if (updateError) {
      console.error('notifications API: 通知更新エラー:', updateError)
      return NextResponse.json(
        { message: '通知の更新に失敗しました' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '通知を更新しました',
      notification: updatedNotification
    }, { status: 200 })

  } catch (error) {
    console.error('notifications API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
