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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const bidId = params.id
    const body = await request.json()
    const { action, rejection_reason, skip_box_creation } = body

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

    // 発注者権限をチェック（OrgAdmin もしくは Admin を許可）
    const { data: allMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError) {
      return NextResponse.json({ message: 'メンバーシップ取得に失敗しました' }, { status: 500 })
    }

    const hasOrgAdmin = (allMemberships || []).some(m => m.role === 'OrgAdmin' && m.org_id === bid.projects.org_id)
    const hasAdmin = (allMemberships || []).some(m => m.role === 'Admin')

    if (!hasOrgAdmin && !hasAdmin) {
      return NextResponse.json({
        message: 'この操作を実行する権限がありません',
        debug: { orgId: bid.projects.org_id }
      }, { status: 403 })
    }

    // アクションに応じて処理
    if (action === 'approve') {
      // 入札を承認（スキーマ互換: status を 'accepted' に更新）
      const { data: updatedBid, error: updateError } = await supabaseAdmin
        .from('bids')
        .update({ status: 'accepted' })
        .eq('id', bidId)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ message: '入札の承認に失敗しました', details: String(updateError.message || updateError) }, { status: 500 })
      }

      // Boxフォルダを作成（入札承認後）- skip_box_creationがtrueの場合はスキップ
      if (!skip_box_creation) {
        try {
          // 組織のBOXフォルダIDを取得
          const { data: organization, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('box_folder_id')
            .eq('id', bid.projects.org_id)
            .single()

          const parentId = organization?.box_folder_id

          if (orgError || !organization) {
            console.error('組織情報の取得に失敗:', orgError)
          } else if (parentId) {
            const folderName = `[PRJ-${bid.projects.id.slice(0, 8)}] ${bid.projects.title}`
            const subfolders = ['01_受取データ', '02_作業フォルダ', '03_納品データ', '04_契約資料']

            const boxApiUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/provision`

            // タイムアウト付きでBOX API呼び出し
            const boxPromise = fetch(boxApiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: folderName,
                parentId,
                subfolders
              })
            })

            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('BOX API timeout')), 5000) // 5秒でタイムアウト
            })

            const boxResponse = await Promise.race([boxPromise, timeoutPromise]) as Response

            if (boxResponse.ok) {
              const { folderId } = await boxResponse.json()

              // プロジェクトにBox情報を保存
              await supabaseAdmin
                .from('projects')
                .update({
                  box_folder_id: folderId
                  // box_subfoldersカラムが存在しないため一時的に除外
                })
                .eq('id', bid.projects.id)
              
            }
          } else {
            console.warn(`組織ID: ${bid.projects.org_id} のBOXフォルダIDが設定されていません`)
          }
        } catch (boxError) {
          console.warn('BOX フォルダ作成エラー（入札承認は続行）:', boxError)
          // Box作成エラーは入札承認を妨げない
        }
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
        return NextResponse.json({ message: '拒否理由を入力してください' }, { status: 400 })
      }

      // 入札を拒否（まず status のみ、列互換のため）
      const { error: statusErr } = await supabaseAdmin
        .from('bids')
        .update({ status: 'rejected' })
        .eq('id', bidId)
      if (statusErr) {
        return NextResponse.json({ message: '入札の拒否に失敗しました', details: String(statusErr.message || statusErr) }, { status: 500 })
      }

      // rejection_reason 列があれば追記
      try {
        const probe = await supabaseAdmin.from('bids').select('rejection_reason').limit(1)
        if (!probe.error) {
          await supabaseAdmin.from('bids').update({ rejection_reason }).eq('id', bidId)
        }
      } catch (_) {}

      const { data: updatedBid, error: fetchError } = await supabaseAdmin
        .from('bids')
        .select('*')
        .eq('id', bidId)
        .single()

      if (fetchError) {
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
