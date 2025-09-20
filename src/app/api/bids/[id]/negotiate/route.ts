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
    const { action, rejection_reason } = body

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
          org_id,
          contractor_id
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

    // 発注者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)
      .eq('organization_id', bid.projects.org_id)
      .single()

    if (membershipError || !memberships || memberships.role !== 'OrgAdmin') {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません' },
        { status: 403 }
      )
    }

    // アクションに応じて処理
    if (action === 'approve') {
      // 入札を承認
      const { data: updatedBid, error: updateError } = await supabaseAdmin
        .from('bids')
        .update({
          negotiation_status: 'approved',
          status: 'approved'
        })
        .eq('id', bidId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { message: '入札の承認に失敗しました' },
          { status: 500 }
        )
      }

      // Boxフォルダを作成（入札承認後）
      try {
        const parentId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID

        if (parentId) {
          const folderName = `[PRJ-${bid.projects.id.slice(0, 8)}] ${bid.projects.title}`
          const subfolders = ['受取', '作業', '納品', '契約']

          const boxApiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/provision`

          const boxResponse = await fetch(boxApiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: folderName,
              parentId,
              subfolders
            })
          })

          if (boxResponse.ok) {
            const { folderId, subfolderIds } = await boxResponse.json()

            // プロジェクトにBox情報を保存
            await supabaseAdmin
              .from('projects')
              .update({
                box_folder_id: folderId
                // box_subfoldersカラムが存在しないため一時的に除外
                // box_subfolders: subfolderIds ? JSON.stringify(subfolderIds) : null
              })
              .eq('id', bid.projects.id)
          }
        }
      } catch (boxError) {
        // Box作成エラーは入札承認を妨げない
      }

      // 受注者に通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: bid.contractor_id,
          title: '入札が承認されました',
          message: `案件「${bid.projects.title}」の入札金額（¥${bid.bid_amount.toLocaleString()}）が承認されました。契約の作成をお待ちください。`,
          type: 'bid_approved',
          data: {
            bid_id: bidId,
            project_id: bid.projects.id
          }
        })

      return NextResponse.json({
        message: '入札を承認しました',
        bid: updatedBid
      })

    } else if (action === 'reject') {
      if (!rejection_reason) {
        return NextResponse.json(
          { message: '拒否理由を入力してください' },
          { status: 400 }
        )
      }

      // 入札を拒否
      const { data: updatedBid, error: updateError } = await supabaseAdmin
        .from('bids')
        .update({
          negotiation_status: 'rejected',
          rejection_reason: rejection_reason
        })
        .eq('id', bidId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json(
          { message: '入札の拒否に失敗しました' },
          { status: 500 }
        )
      }

      // 受注者に通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: bid.contractor_id,
          title: '入札金額について',
          message: `案件「${bid.projects.title}」の入札金額について、発注者から以下の理由で拒否されました：\n\n${rejection_reason}\n\nこの理由に同意されますか？`,
          type: 'bid_rejected',
          data: {
            bid_id: bidId,
            project_id: bid.projects.id,
            rejection_reason: rejection_reason
          }
        })

      return NextResponse.json({
        message: '入札を拒否しました。受注者に通知を送信しました。',
        bid: updatedBid
      })

    } else {
      return NextResponse.json(
        { message: '無効なアクションです' },
        { status: 400 }
      )
    }

  } catch (error) {
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
