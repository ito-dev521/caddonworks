import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

/**
 * 重複した業務完了届を確認・削除するAPI
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const searchParams = request.nextUrl.searchParams
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json({ message: 'メールアドレスを指定してください' }, { status: 400 })
    }

    // ユーザーを取得
    const { data: user } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('email', email)
      .single()

    if (!user) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 業務完了届を取得
    const { data: reports, error } = await supabase
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
        )
      `)
      .eq('contractor_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('業務完了届取得エラー:', error)
      return NextResponse.json({ message: 'データ取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      user,
      reports,
      total: reports?.length || 0
    })

  } catch (error) {
    console.error('エラー:', error)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const body = await request.json()
    const { report_ids } = body

    if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
      return NextResponse.json({ message: '削除する業務完了届IDを指定してください' }, { status: 400 })
    }

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '運営者のみ実行できます' }, { status: 403 })
    }

    // 業務完了届を削除
    const { error: deleteError } = await supabase
      .from('completion_reports')
      .delete()
      .in('id', report_ids)

    if (deleteError) {
      console.error('削除エラー:', deleteError)
      return NextResponse.json({ message: '削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '業務完了届を削除しました',
      deleted_count: report_ids.length
    })

  } catch (error) {
    console.error('エラー:', error)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}
