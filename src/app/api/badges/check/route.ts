import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBadgeChecker } from '@/lib/badge-checker'

/**
 * POST /api/badges/check
 * ユーザーのバッジ取得条件をチェックし、新規バッジを付与
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const body = await request.json()
    const { userId, projectId } = body

    // リクエストユーザーが本人または管理者であることを確認
    if (userId !== user.id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'admin') {
        return NextResponse.json({ error: '権限がありません' }, { status: 403 })
      }
    }

    // バッジチェッカーを使用してバッジを付与
    const badgeChecker = createBadgeChecker()
    const newBadges = await badgeChecker.checkAndAwardBadges(userId, projectId)

    return NextResponse.json({
      success: true,
      newBadges,
      count: newBadges.length,
    })
  } catch (error) {
    console.error('バッジチェックエラー:', error)
    return NextResponse.json({ error: 'バッジチェックに失敗しました' }, { status: 500 })
  }
}