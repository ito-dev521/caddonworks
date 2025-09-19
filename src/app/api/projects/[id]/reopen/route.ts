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
    
    const { 
      new_bidding_deadline, 
      new_budget, 
      new_start_date, 
      new_end_date,
      new_required_contractors,
      new_required_level
    } = await request.json()

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

    // 案件が期限切れかどうかチェック
    const now = new Date()
    const biddingDeadline = new Date(project.bidding_deadline)
    if (biddingDeadline > now) {
      return NextResponse.json(
        { message: 'この案件はまだ期限切れではありません' },
        { status: 400 }
      )
    }

    // 入力された新しい日付の整合性チェック（指定がある場合）
    if (new_bidding_deadline || new_start_date || new_end_date) {
      try {
        const bd = new_bidding_deadline ? new Date(new_bidding_deadline) : new Date(project.bidding_deadline)
        const st = new_start_date ? new Date(new_start_date) : new Date(project.start_date)
        const ed = new_end_date ? new Date(new_end_date) : new Date(project.end_date)

        const bdEndOfDay = new Date(bd)
        bdEndOfDay.setHours(23, 59, 59, 999)

        if (st < bdEndOfDay) {
          return NextResponse.json(
            { message: '開始日は入札締切日以降の日付にしてください' },
            { status: 400 }
          )
        }
        if (ed < st) {
          return NextResponse.json(
            { message: '納期は開始日以降の日付にしてください' },
            { status: 400 }
          )
        }
      } catch (e) {
        return NextResponse.json(
          { message: '日付の検証中にエラーが発生しました' },
          { status: 400 }
        )
      }
    }

    // 案件の再登録処理
    const updateData: any = {
      status: 'bidding',
      contractor_id: null,
      updated_at: new Date().toISOString()
    }

    // 新しい情報を設定
    if (new_bidding_deadline) {
      updateData.bidding_deadline = new_bidding_deadline
    }
    if (new_budget) {
      updateData.budget = new_budget
    }
    if (new_start_date) {
      updateData.start_date = new_start_date
    }
    if (new_end_date) {
      updateData.end_date = new_end_date
    }
    if (new_required_contractors) {
      updateData.required_contractors = new_required_contractors
    }
    if (new_required_level) {
      updateData.required_level = new_required_level
    }

    // 案件を更新
    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('案件再登録エラー:', updateError)
      return NextResponse.json(
        { message: '案件の再登録に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    // 関連する入札データを削除（古い入札をクリア）
    await supabaseAdmin
      .from('bids')
      .delete()
      .eq('project_id', projectId)

    // 関連する契約データを削除（古い契約をクリア）
    await supabaseAdmin
      .from('contracts')
      .delete()
      .eq('project_id', projectId)

    // プロジェクト参加者を削除
    await supabaseAdmin
      .from('project_participants')
      .delete()
      .eq('project_id', projectId)


    return NextResponse.json({
      message: '案件を再登録しました',
      project: updatedProject
    }, { status: 200 })

  } catch (error) {
    console.error('案件再登録エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
