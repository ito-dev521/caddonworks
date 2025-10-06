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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id
    const { reason } = await request.json()

    

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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('ユーザープロフィール取得エラー:', userError)
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // ユーザーの組織情報を取得
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        org_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      console.error('組織情報取得エラー:', membershipError)
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（OrgAdmin権限が必要です）' },
        { status: 403 }
      )
    }

    const userOrgId = membership.org_id

    // 案件情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック（発注者のみ）
    if (project.org_id !== userOrgId) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません' },
        { status: 403 }
      )
    }

    // 案件を中止に更新
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('案件中止エラー:', updateError)
      return NextResponse.json(
        { message: '案件の中止に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    // 入札者と受注者に通知を送信
    try {
      

      // 入札者を取得
      const { data: bidders, error: biddersError } = await supabaseAdmin
        .from('bids')
        .select('contractor_id')
        .eq('project_id', projectId)
        .eq('status', 'submitted')

      if (!biddersError && bidders && bidders.length > 0) {
        const bidderIds = bidders.map(bid => bid.contractor_id)
        
        // 入札者に通知を送信
        const bidderNotifications = bidderIds.map(bidderId => ({
          user_id: bidderId,
          type: 'project_suspended',
          title: '案件が中止されました',
          message: `案件「${project.title}」が中止されました。中止理由: ${reason}`,
          data: {
            project_id: projectId,
            project_title: project.title,
            suspend_reason: reason,
            suspended_by: userProfile.display_name
          }
        }))

        await supabaseAdmin
          .from('notifications')
          .insert(bidderNotifications)

        
      }

      // 受注者を取得（契約済みの場合）
      if (project.contractor_id) {
        await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: project.contractor_id,
            type: 'project_suspended',
            title: '案件が中止されました',
            message: `案件「${project.title}」が中止されました。中止理由: ${reason}`,
            data: {
              project_id: projectId,
              project_title: project.title,
              suspend_reason: reason,
              suspended_by: userProfile.display_name
            }
          })

        
      }

      // 複数受注者案件の場合
      const { data: contracts, error: contractsError } = await supabaseAdmin
        .from('contracts')
        .select('contractor_id')
        .eq('project_id', projectId)
        .eq('status', 'signed')

      if (!contractsError && contracts && contracts.length > 0) {
        const contractorIds = contracts.map(contract => contract.contractor_id)
        
        const contractorNotifications = contractorIds.map(contractorId => ({
          user_id: contractorId,
          type: 'project_suspended',
          title: '案件が中止されました',
          message: `案件「${project.title}」が中止されました。中止理由: ${reason}`,
          data: {
            project_id: projectId,
            project_title: project.title,
            suspend_reason: reason,
            suspended_by: userProfile.display_name
          }
        }))

        await supabaseAdmin
          .from('notifications')
          .insert(contractorNotifications)

        
      }

    } catch (notificationError) {
      console.error('通知送信エラー:', notificationError)
      // 通知エラーが発生しても案件中止は成功させる
    }

    

    return NextResponse.json({
      message: '案件を中止しました',
      project: updatedProject
    }, { status: 200 })

  } catch (error) {
    console.error('案件中止エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
