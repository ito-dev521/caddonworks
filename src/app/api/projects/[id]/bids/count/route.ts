import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json(
        { message: 'プロジェクトIDが必要です' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseAdmin()

    // プロジェクトの基本情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, required_contractors, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    // 入札数を取得
    const { count: bidCount, error: bidError } = await supabase
      .from('bids')
      .select('*', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('status', 'submitted')

    if (bidError) {
      console.error('入札数取得エラー:', bidError)
      return NextResponse.json(
        { message: '入札数の取得に失敗しました' },
        { status: 500 }
      )
    }

    const currentBidCount = bidCount || 0
    const isFull = currentBidCount >= project.required_contractors

    return NextResponse.json({
      project_id: projectId,
      required_contractors: project.required_contractors,
      current_bid_count: currentBidCount,
      is_full: isFull,
      can_bid: !isFull && project.status === 'bidding'
    })

  } catch (error) {
    console.error('入札数取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
