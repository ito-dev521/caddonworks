import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

// 優先依頼への応答
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: invitationId } = params
    const body = await request.json()
    const { response, response_notes } = body

    if (!response || !['accepted', 'declined'].includes(response)) {
      return NextResponse.json({ message: '有効な応答が必要です（accepted または declined）' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 優先依頼の存在確認と権限チェック
    const { data: invitation, error: checkError } = await supabaseAdmin
      .from('priority_invitations')
      .select('id, contractor_id, project_id, response, expires_at')
      .eq('id', invitationId)
      .eq('contractor_id', userProfile.id)
      .single()

    if (checkError || !invitation) {
      return NextResponse.json({ message: '優先依頼が見つかりません' }, { status: 404 })
    }

    // 既に応答済みかチェック
    if (invitation.response && invitation.response !== 'pending') {
      return NextResponse.json({ message: '既に応答済みです' }, { status: 400 })
    }

    // 期限切れかチェック
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      return NextResponse.json({ message: '応答期限が切れています' }, { status: 400 })
    }

    // 応答を更新
    const { error: updateError } = await supabaseAdmin
      .from('priority_invitations')
      .update({
        response: response,
        response_notes: response_notes || null,
        responded_at: new Date().toISOString()
      })
      .eq('id', invitationId)

    if (updateError) {
      console.error('優先依頼応答エラー:', updateError)
      return NextResponse.json({ message: '応答の保存に失敗しました' }, { status: 500 })
    }

    // 受諾の場合、案件のステータスを更新
    if (response === 'accepted') {
      const { error: projectUpdateError } = await supabaseAdmin
        .from('projects')
        .update({
          contractor_id: userProfile.id,
          status: 'in_progress'
        })
        .eq('id', invitation.project_id)

      if (projectUpdateError) {
        console.error('プロジェクト更新エラー:', projectUpdateError)
        // エラーが発生しても応答は保存されているので、警告のみ
      }
    }

    return NextResponse.json({
      message: response === 'accepted' ? '依頼を受諾しました' : '依頼を辞退しました'
    }, { status: 200 })

  } catch (error) {
    console.error('優先依頼応答API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
