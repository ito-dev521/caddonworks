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

export async function POST(request: NextRequest) {
  try {

    // 入札中の案件の入札締切日を30日後に更新
    const { data: updatedProjects, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        bidding_deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      })
      .eq('status', 'bidding')
      .select('id, title, bidding_deadline')

    if (updateError) {
      console.error('update-jobs-deadline API: 更新エラー:', updateError)
      return NextResponse.json(
        { message: '案件の更新に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }


    // 更新後の案件一覧を取得
    const { data: projects, error: fetchError } = await supabaseAdmin
      .from('projects')
      .select('id, title, bidding_deadline, status, budget')
      .eq('status', 'bidding')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('update-jobs-deadline API: 取得エラー:', fetchError)
      return NextResponse.json(
        { message: '案件の取得に失敗しました: ' + fetchError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '案件の入札締切日を更新しました',
      updatedCount: updatedProjects?.length || 0,
      projects: projects || []
    })

  } catch (error) {
    console.error('update-jobs-deadline API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

