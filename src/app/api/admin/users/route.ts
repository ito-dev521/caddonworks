import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { type MemberLevel } from '@/lib/member-level'

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

// 全ユーザー一覧を取得（運営者用）
export async function GET(request: NextRequest) {
  try {
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
      .select('id, email, display_name, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 運営者権限チェック
    if (userProfile.role !== 'admin') {
      return NextResponse.json(
        { message: '運営者権限が必要です' },
        { status: 403 }
      )
    }

    // 全ユーザー一覧を取得
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        display_name,
        specialties,
        qualifications,
        experience_years,
        member_level,
        formal_name,
        phone_number,
        address,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('ユーザー一覧取得エラー:', usersError)
      return NextResponse.json(
        { message: 'ユーザー一覧の取得に失敗しました' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      users: users || []
    }, { status: 200 })

  } catch (error) {
    console.error('admin users API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

// ユーザーの会員レベルを更新（運営者用）
export async function PUT(request: NextRequest) {
  try {
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
      .select('id, email, display_name, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 運営者権限チェック
    if (userProfile.role !== 'admin') {
      return NextResponse.json(
        { message: '運営者権限が必要です' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { userId, memberLevel } = body

    if (!userId || !memberLevel) {
      return NextResponse.json(
        { message: 'ユーザーIDと会員レベルが必要です' },
        { status: 400 }
      )
    }

    // 会員レベルを更新
    const { data, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        member_level: memberLevel,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (updateError) {
      console.error('会員レベル更新エラー:', updateError)
      return NextResponse.json(
        { message: '会員レベルの更新に失敗しました' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '会員レベルが正常に更新されました',
      user: data
    }, { status: 200 })

  } catch (error) {
    console.error('admin users update API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

