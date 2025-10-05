import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId')

    // 業務完了届を取得
    const query = supabase
      .from('completion_reports')
      .select(`
        id,
        project_id,
        contractor_id,
        status,
        created_at,
        actual_completion_date,
        projects (
          id,
          title
        ),
        users!completion_reports_contractor_id_fkey (
          id,
          email,
          display_name
        )
      `)
      .order('created_at', { ascending: false })

    if (userId) {
      query.eq('contractor_id', userId)
    }

    const { data: reports, error } = await query

    if (error) {
      console.error('業務完了届取得エラー:', error)
      return NextResponse.json({ message: 'データ取得に失敗しました', error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      reports,
      total: reports?.length || 0
    })

  } catch (error: any) {
    console.error('エラー:', error)
    return NextResponse.json({ message: 'サーバーエラー', error: error.message }, { status: 500 })
  }
}
