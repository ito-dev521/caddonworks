import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// Box SDK経由ではなく、安定化のためHTTPのプロビジョナに委譲する

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const { action, comment } = await request.json() // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { message: '無効なアクションです' },
        { status: 400 }
      )
    }

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

    // ユーザーの組織情報を取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 案件情報を取得
    let { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        status,
        approver_ids,
        org_id,
        priority_invitation_candidate_id
      `)
      .eq('id', projectId)
      .single()

    // 互換性: カラム未追加の環境では候補カラムなしで再取得
    if ((projectError && (projectError.message || '').includes('priority_invitation_candidate_id'))) {
      const fallback = await supabaseAdmin
        .from('projects')
        .select(`
          id,
          title,
          status,
          approver_ids,
          org_id
        `)
        .eq('id', projectId)
        .single()
      project = (fallback.data as any) || null
      projectError = fallback.error as any
      if (project) {
        ;(project as any).priority_invitation_candidate_id = null
      }
    }

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // 承認者であることを確認
    if (!project.approver_ids || !Array.isArray(project.approver_ids) || !project.approver_ids.includes(userProfile.id)) {
      return NextResponse.json(
        { message: 'この案件の承認権限がありません' },
        { status: 403 }
      )
    }

    // 案件のステータスが承認待ちであることを確認
    if (project.status !== 'pending_approval') {
      return NextResponse.json(
        { message: 'この案件は承認待ちではありません' },
        { status: 400 }
      )
    }

    // 期限切れチェック: bidding_deadline が過去の案件は承認不可
    try {
      const { data: deadlineRow } = await supabaseAdmin
        .from('projects')
        .select('bidding_deadline')
        .eq('id', projectId)
        .single()

      const deadlineStr = (deadlineRow as any)?.bidding_deadline
      if (deadlineStr) {
        const deadline = new Date(deadlineStr)
        const endOfDay = new Date(deadline)
        endOfDay.setHours(23, 59, 59, 999)
        if (new Date() > endOfDay) {
          return NextResponse.json(
            { message: '入札締切が過ぎた案件は承認できません' },
            { status: 400 }
          )
        }
      }
    } catch (_) {}

    // 案件のステータスを更新
    // 承認時に優先招待候補があれば priority_invitation にして一般公開を避ける
    const shouldStartPriority = action === 'approve' && !!project.priority_invitation_candidate_id
    const newStatus = action === 'approve'
      ? (shouldStartPriority ? 'priority_invitation' : 'bidding')
      : 'rejected'
    let boxFolderId: string | null = null

    // 承認の場合はBOXフォルダを作成（HTTPエンドポイントに委譲）
    if (action === 'approve') {
      try {
        // 組織のBOXフォルダIDを取得
        const { data: organization, error: orgError } = await supabaseAdmin
          .from('organizations')
          .select('box_folder_id')
          .eq('id', project.org_id)
          .single()

        if (orgError || !organization) {
          console.error('組織情報の取得に失敗:', orgError)
        } else {
          const parentId = organization.box_folder_id
          if (parentId) {
            const name = `[PRJ-${project.id.slice(0,8)}] ${project.title}`
            const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/provision`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, parentId, subfolders: ['受取','作業','納品','契約'] })
            })
            if (res.ok) {
              const json = await res.json()
              boxFolderId = json.folderId
            } else {
              const text = await res.text()
              console.warn('BOX provision failed:', text)
            }
          } else {
            console.warn(`組織ID: ${project.org_id} のBOXフォルダIDが設定されていません`)
          }
        }
      } catch (e) {
        console.error('BOX provision error:', e)
      }
    }

    const updateData: any = {
      status: newStatus,
      approver_ids: null, // 承認後は承認者IDをクリア
      approved_by: action === 'approve' ? userProfile.id : null, // 承認者のIDを保存
      priority_invitation_active: shouldStartPriority
    }

    // BOXフォルダが作成された場合は追加
    if (boxFolderId) {
      updateData.box_folder_id = boxFolderId
    }

    let updateErrorMessage: string | null = null
    let updateRes = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)

    if (updateRes.error) {
      // priority_invitation_active カラムが無い環境へのフォールバック
      const msg = updateRes.error.message || ''
      if (msg.includes('priority_invitation_active')) {
        const fallbackData: any = { ...updateData }
        delete fallbackData.priority_invitation_active
        const retry = await supabaseAdmin
          .from('projects')
          .update(fallbackData)
          .eq('id', projectId)
        if (retry.error) {
          updateErrorMessage = retry.error.message
        }
      } else {
        updateErrorMessage = msg
      }
    }

    if (updateErrorMessage) {
      console.error('案件ステータス更新エラー:', updateErrorMessage)
      // 制約未対応の環境では、一般公開(bidding)のまま優先招待のみ送るフォールバックに切替
      if (shouldStartPriority && updateErrorMessage.includes('projects_status_check')) {
        // ステータス変更はスキップし、後続の優先招待作成のみ実行
      } else {
        return NextResponse.json(
          { message: '案件の更新に失敗しました' },
          { status: 500 }
        )
      }
    }

    // 案件作成者に通知を送信
    try {
      // 案件作成者のメンバーシップを取得
      const { data: projectMemberships, error: projectMembershipError } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('org_id', project.org_id)
        .eq('role', 'OrgAdmin')

      if (projectMemberships && !projectMembershipError) {
        const notificationType = action === 'approve' ? 'project_approved' : 'project_rejected'
        const notificationTitle = action === 'approve' ? '案件承認完了' : '案件承認却下'
        const notificationMessage = action === 'approve' 
          ? `案件「${project.title}」が承認されました。`
          : `案件「${project.title}」が却下されました。${comment ? `理由: ${comment}` : ''}`

        // 組織内のすべてのOrgAdminに通知を送信
        for (const membership of projectMemberships) {
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: membership.user_id,
              type: notificationType,
              title: notificationTitle,
              message: notificationMessage,
              data: {
                project_id: projectId,
                project_title: project.title,
                approver_id: userProfile.id,
                approver_name: userProfile.display_name,
                action: action,
                comment: comment || null
              }
            })
        }
      }
    } catch (notificationError) {
      console.error('通知送信エラー:', notificationError)
      // 通知エラーは承認処理を妨げない
    }

    // 優先招待を作成（必要な場合）
    if (shouldStartPriority) {
      try {
        const expiresAt = new Date()
        expiresAt.setHours(expiresAt.getHours() + 24)

        const { data: invitation, error: invitationError } = await supabaseAdmin
          .from('priority_invitations')
          .insert({
            project_id: projectId,
            contractor_id: project.priority_invitation_candidate_id,
            org_id: project.org_id,
            response: 'pending',
            expires_at: expiresAt.toISOString()
          })
          .select()
          .single()

        if (!invitationError && invitation) {
          // 通知
          await supabaseAdmin
            .from('notifications')
            .insert({
              user_id: project.priority_invitation_candidate_id,
              type: 'priority_invitation',
              title: '優先案件のご案内',
              message: `案件「${project.title}」への優先招待をお送りしました。24時間以内にご回答ください。`,
              data: {
                project_id: projectId,
                project_title: project.title,
                invitation_id: invitation.id,
                expires_at: expiresAt.toISOString()
              }
            })
        }
      } catch (e) {
        console.error('承認時の優先招待作成エラー:', e)
      }
    }

    const responseMessage = action === 'approve'
      ? (shouldStartPriority ? '案件が承認され、優先招待を送信しました' : '案件が承認されました（一般公開）')
      : '案件が却下されました'

    return NextResponse.json({
      message: responseMessage,
      project: {
        id: projectId,
        status: newStatus,
        box_folder_id: boxFolderId,
        priority_invitation_active: shouldStartPriority
      }
    }, { status: 200 })

  } catch (error) {
    console.error('案件承認処理エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
