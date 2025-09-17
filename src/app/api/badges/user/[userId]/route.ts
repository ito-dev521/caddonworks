import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params

    // 認証ヘッダーからトークンを取得
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

    // ユーザープロフィール取得
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザー情報の取得に失敗しました' },
        { status: 400 }
      )
    }

    // 自分のバッジのみ取得可能
    if (userProfile.id !== userId) {
      return NextResponse.json(
        { message: '他のユーザーのバッジは閲覧できません' },
        { status: 403 }
      )
    }

    // ユーザーのバッジを取得
    const { data: userBadges, error: badgesError } = await supabaseAdmin
      .from('user_badges')
      .select(`
        id,
        badge_id,
        earned_at,
        project_id,
        metadata,
        badges (
          id,
          code,
          name,
          description,
          category,
          tier,
          icon_name
        )
      `)
      .eq('user_id', userId)
      .order('earned_at', { ascending: false })

    if (badgesError) {
      console.error('バッジ取得エラー:', badgesError)
      return NextResponse.json(
        { message: 'バッジの取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      badges: userBadges || []
    })

  } catch (error) {
    console.error('バッジ取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
