import { NextRequest, NextResponse } from 'next/server'
import { createBadgeChecker } from '@/lib/badge-checker'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

/**
 * バッジ判定・付与API
 * プロジェクト完了時などに呼び出され、条件を満たしたバッジを自動付与
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック（Service Role Key必須）
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { user_id, project_id } = body

    if (!user_id) {
      return NextResponse.json({ message: 'user_idが必要です' }, { status: 400 })
    }

    // バッジチェッカーを初期化
    const badgeChecker = createBadgeChecker()

    // バッジをチェックして付与
    const newBadges = await badgeChecker.checkAndAwardBadges(user_id, project_id)

    if (newBadges.length === 0) {
      return NextResponse.json({
        message: '新しいバッジはありませんでした',
        badges: []
      }, { status: 200 })
    }

    // 付与されたバッジの詳細情報を取得
    const badgeIds = newBadges.map(b => b.badge_id)
    const { data: badgeDetails, error: badgeError } = await supabaseAdmin
      .from('badges')
      .select('*')
      .in('id', badgeIds)

    if (badgeError) {
      console.error('バッジ詳細取得エラー:', badgeError)
    }

    // バッジ取得通知を送信
    for (const badge of newBadges) {
      const badgeInfo = badgeDetails?.find(b => b.id === badge.badge_id)

      if (badgeInfo) {
        await supabaseAdmin.from('notifications').insert({
          user_id: user_id,
          type: 'badge_earned',
          title: '🏆 新しいバッジを獲得しました！',
          message: `おめでとうございます！「${badgeInfo.name}」バッジを獲得しました。`,
          data: {
            badge_id: badge.badge_id,
            badge_name: badgeInfo.name,
            badge_tier: badgeInfo.tier,
            project_id: project_id
          }
        })
      }
    }

    return NextResponse.json({
      message: `${newBadges.length}件の新しいバッジを付与しました`,
      badges: newBadges,
      badge_details: badgeDetails
    }, { status: 200 })

  } catch (error) {
    console.error('バッジ判定APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * 管理者用：全ユーザーのバッジを再計算
 */
export async function PUT(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者権限チェック
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile || userProfile.role !== 'SystemAdmin') {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 全ユーザーを取得
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id')

    if (usersError || !users) {
      return NextResponse.json({ message: 'ユーザー取得に失敗しました' }, { status: 500 })
    }

    const badgeChecker = createBadgeChecker()
    let totalNewBadges = 0

    // 各ユーザーのバッジをチェック
    for (const user of users) {
      try {
        const newBadges = await badgeChecker.checkAndAwardBadges(user.id)
        totalNewBadges += newBadges.length
      } catch (error) {
        console.error(`ユーザー ${user.id} のバッジチェックエラー:`, error)
      }
    }

    return NextResponse.json({
      message: `全ユーザーのバッジチェックが完了しました`,
      users_processed: users.length,
      total_badges_awarded: totalNewBadges
    }, { status: 200 })

  } catch (error) {
    console.error('バッジ再計算APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}