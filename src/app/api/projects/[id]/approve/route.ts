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
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        status,
        approver_id,
        org_id,
        users!projects_approver_id_fkey (
          id,
          display_name,
          email
        )
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // 承認者であることを確認
    if (project.approver_id !== userProfile.id) {
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

    // 案件のステータスを更新
    const newStatus = action === 'approve' ? 'bidding' : 'rejected'
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ 
        status: newStatus,
        approver_id: null // 承認後は承認者IDをクリア
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('案件ステータス更新エラー:', updateError)
      return NextResponse.json(
        { message: '案件の更新に失敗しました' },
        { status: 500 }
      )
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

    return NextResponse.json({
      message: action === 'approve' ? '案件が承認されました' : '案件が却下されました',
      project: {
        id: projectId,
        status: newStatus
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
