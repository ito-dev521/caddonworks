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

// お気に入り会員への優先招待を送信
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { contractor_id, expires_in_hours = 24 } = await request.json()
    const projectId = params.id

    // 認証チェック
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
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィール取得
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

    // プロジェクト情報と組織権限を確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        *,
        organizations!inner(id, name)
      `)
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    // 組織のメンバーシップ確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
      .single()

    if (membershipError || !membership || membership.role !== 'OrgAdmin') {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません' },
        { status: 403 }
      )
    }

    // お気に入り会員であることを確認
    const { data: favoriteCheck, error: favoriteError } = await supabaseAdmin
      .from('favorite_members')
      .select('id')
      .eq('org_id', project.org_id)
      .eq('contractor_id', contractor_id)
      .eq('is_active', true)
      .single()

    if (favoriteError || !favoriteCheck) {
      return NextResponse.json(
        { message: '指定された受注者はお気に入り会員に登録されていません' },
        { status: 400 }
      )
    }

    // 既に優先招待が送信されているかチェック
    const { data: existingInvitation, error: invitationError } = await supabaseAdmin
      .from('priority_invitations')
      .select('id, response')
      .eq('project_id', projectId)
      .eq('contractor_id', contractor_id)
      .single()

    if (existingInvitation && !invitationError) {
      return NextResponse.json(
        { message: 'この受注者には既に優先招待が送信されています' },
        { status: 400 }
      )
    }

    // 有効期限を設定
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

    // 優先招待を作成
    const { data: invitation, error: createError } = await supabaseAdmin
      .from('priority_invitations')
      .insert({
        project_id: projectId,
        contractor_id: contractor_id,
        org_id: project.org_id,
        response: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (createError) {
      return NextResponse.json(
        { message: '優先招待の作成に失敗しました: ' + createError.message },
        { status: 500 }
      )
    }

    // 受注者に通知を送信
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: contractor_id,
        type: 'priority_invitation',
        title: '優先案件のご案内',
        message: `案件「${project.title}」への優先招待をお送りしました。${expires_in_hours}時間以内にご回答ください。`,
        data: {
          project_id: projectId,
          project_title: project.title,
          invitation_id: invitation.id,
          expires_at: expiresAt.toISOString(),
          budget: project.budget,
          org_name: project.organizations.name
        }
      })

    if (notificationError) {
      console.error('通知送信エラー:', notificationError)
    }

    return NextResponse.json({
      message: '優先招待を送信しました',
      invitation: invitation,
      expires_at: expiresAt.toISOString()
    }, { status: 201 })

  } catch (error) {
    console.error('優先招待エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 優先招待への回答
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { response, response_notes } = await request.json()
    const projectId = params.id

    if (!['accepted', 'declined'].includes(response)) {
      return NextResponse.json(
        { message: '無効な回答です' },
        { status: 400 }
      )
    }

    // 認証チェック
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
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィール取得
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

    // 優先招待を確認（自分宛でかつ有効期限内）
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('priority_invitations')
      .select(`
        *,
        projects!inner(title, org_id, status)
      `)
      .eq('project_id', projectId)
      .eq('contractor_id', userProfile.id)
      .eq('response', 'pending')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { message: '有効な優先招待が見つかりません' },
        { status: 404 }
      )
    }

    // 有効期限チェック
    const now = new Date()
    const expiresAt = new Date(invitation.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { message: '招待の有効期限が切れています' },
        { status: 400 }
      )
    }

    // 招待への回答を更新
    const { error: updateError } = await supabaseAdmin
      .from('priority_invitations')
      .update({
        response: response,
        response_notes: response_notes,
        responded_at: new Date().toISOString()
      })
      .eq('id', invitation.id)

    if (updateError) {
      return NextResponse.json(
        { message: '回答の保存に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    // プロジェクトステータスを更新
    if (response === 'accepted') {
      // 承諾の場合：プロジェクトは引き続き優先招待中のステータスを維持
      // 発注者が正式に契約を作成するまで待機
    } else if (response === 'declined') {
      // 拒否の場合：プロジェクトを一般公開（bidding）に変更
      const { error: projectUpdateError } = await supabaseAdmin
        .from('projects')
        .update({
          status: 'bidding',
          // プロジェクトに優先招待フラグがあれば削除
          priority_invitation_active: false
        })
        .eq('id', projectId)

      if (projectUpdateError) {
        console.error('プロジェクトステータス更新エラー:', projectUpdateError)
      }
    }

    // 発注者に通知を送信
    const { data: orgMembers } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('org_id', invitation.projects.org_id)
      .eq('role', 'OrgAdmin')

    if (orgMembers) {
      for (const member of orgMembers) {
        const { error: notificationError } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: member.user_id,
            type: 'priority_invitation_response',
            title: response === 'accepted' ? '優先招待が承諾されました' : '優先招待が拒否されました',
            message: `${userProfile.display_name}さんが案件「${invitation.projects.title}」の優先招待を${response === 'accepted' ? '承諾' : '拒否'}しました。`,
            data: {
              project_id: projectId,
              project_title: invitation.projects.title,
              contractor_id: userProfile.id,
              contractor_name: userProfile.display_name,
              response: response,
              response_notes: response_notes
            }
          })

        if (notificationError) {
          console.error('通知送信エラー:', notificationError)
        }
      }
    }

    return NextResponse.json({
      message: response === 'accepted' ? '優先招待を承諾しました' : '優先招待を拒否しました',
      response: response,
      project_status: response === 'declined' ? 'bidding' : invitation.projects.status
    }, { status: 200 })

  } catch (error) {
    console.error('招待回答エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}