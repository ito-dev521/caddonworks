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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bidId = params.id
    const body = await request.json()
    const { agrees_to_rejection } = body

    // Authorizationヘッダーからユーザー情報を取得
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
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 入札情報を取得
    const { data: bid, error: bidError } = await supabaseAdmin
      .from('bids')
      .select(`
        *,
        projects!inner(
          id,
          title,
          org_id
        )
      `)
      .eq('id', bidId)
      .single()

    if (bidError || !bid) {
      return NextResponse.json(
        { message: '入札が見つかりません' },
        { status: 404 }
      )
    }

    // 受注者権限をチェック
    if (bid.contractor_id !== userProfile.id) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません' },
        { status: 403 }
      )
    }

    // 拒否理由への同意/拒否を更新
    const { data: updatedBid, error: updateError } = await supabaseAdmin
      .from('bids')
      .update({
        contractor_agrees_to_rejection: agrees_to_rejection,
        negotiation_status: agrees_to_rejection ? 'cancelled' : 'pending'
      })
      .eq('id', bidId)
      .select()
      .single()

    if (updateError) {
      console.error('入札応答エラー:', updateError)
      return NextResponse.json(
        { message: '入札の応答に失敗しました' },
        { status: 500 }
      )
    }

    // 発注者に通知
    if (agrees_to_rejection) {
      // 受注者が拒否理由に同意した場合
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: bid.projects.org_id,
          title: '入札がキャンセルされました',
          message: `案件「${bid.projects.title}」の入札が受注者によってキャンセルされました。`,
          type: 'bid_cancelled',
          data: {
            bid_id: bidId,
            project_id: bid.projects.id
          }
        })

      return NextResponse.json({
        message: '入札をキャンセルしました。発注者に通知を送信しました。',
        bid: updatedBid
      })

    } else {
      // 受注者が拒否理由に同意しない場合
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: bid.projects.org_id,
          title: '入札金額の再交渉',
          message: `案件「${bid.projects.title}」の入札について、受注者が拒否理由に同意しませんでした。再交渉が必要です。`,
          type: 'bid_renegotiation',
          data: {
            bid_id: bidId,
            project_id: bid.projects.id
          }
        })

      return NextResponse.json({
        message: '拒否理由に同意しませんでした。発注者に再交渉の通知を送信しました。',
        bid: updatedBid
      })
    }

  } catch (error) {
    console.error('入札応答エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
