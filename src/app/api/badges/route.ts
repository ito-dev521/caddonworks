import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/badges
 * 全バッジ一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const tier = searchParams.get('tier')

    const supabase = await createClient()

    let query = supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (category) {
      query = query.eq('category', category)
    }

    if (tier) {
      query = query.eq('tier', tier)
    }

    const { data: badges, error } = await query

    if (error) {
      console.error('バッジ取得エラー:', error)
      return NextResponse.json({ error: 'バッジの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ badges })
  } catch (error) {
    console.error('予期しないエラー:', error)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}