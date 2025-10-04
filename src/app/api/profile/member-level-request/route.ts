import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
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

    // ユーザープロフィール取得
    const { data: userProfile } = await supabaseAdmin
      .from('users')
      .select('id, member_level, level_change_status')
      .eq('auth_user_id', user.id)
      .maybeSingle()

    if (!userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { requested_level } = body

    // バリデーション
    if (!requested_level || !['beginner', 'intermediate', 'advanced'].includes(requested_level)) {
      return NextResponse.json({ message: '無効な会員レベルです' }, { status: 400 })
    }

    // 既にリクエスト中の場合はエラー
    if (userProfile.level_change_status === 'pending') {
      return NextResponse.json({
        message: '既にレベル変更リクエストが承認待ちです'
      }, { status: 400 })
    }

    // 現在のレベルと同じ場合はエラー
    if (userProfile.member_level === requested_level) {
      return NextResponse.json({
        message: '現在のレベルと同じレベルは申請できません'
      }, { status: 400 })
    }

    // レベル変更リクエストを保存
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        requested_member_level: requested_level,
        level_change_status: 'pending',
        level_change_requested_at: new Date().toISOString(),
        level_change_notes: null
      })
      .eq('id', userProfile.id)

    if (updateError) {
      console.error('レベル変更リクエスト保存エラー:', updateError)
      return NextResponse.json({
        message: 'レベル変更リクエストの保存に失敗しました'
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'レベル変更リクエストを送信しました',
      requested_level
    }, { status: 200 })

  } catch (error) {
    console.error('レベル変更リクエストAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
