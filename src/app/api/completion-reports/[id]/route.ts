import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id

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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 完了届を取得
    const { data: report, error } = await supabaseAdmin
      .from('completion_reports')
      .select(`
        *,
        projects!inner(
          id,
          title,
          location,
          category,
          start_date,
          end_date,
          budget,
          org_id
        ),
        contracts!inner(
          id,
          bid_amount,
          start_date,
          end_date,
          signed_at
        ),
        organizations!inner(
          id,
          name
        )
      `)
      .eq('id', reportId)
      .single()

    if (error || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 権限チェック
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    const isContractor = memberships?.some(m => m.role === 'Contractor')
    const isOrgAdmin = memberships?.some(m =>
      m.role === 'OrgAdmin' && m.org_id === report.org_id
    )

    // 自分の完了届または自分の組織の完了届のみアクセス可能
    if (report.contractor_id !== userProfile.id && !isOrgAdmin) {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    return NextResponse.json(report)

  } catch (error) {
    console.error('Completion report get API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 完了届を取得
    const { data: report, error: reportError } = await supabaseAdmin
      .from('completion_reports')
      .select('id, contractor_id, org_id')
      .eq('id', params.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 権限チェック
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    const isContractor = memberships?.some(m => m.role === 'Contractor')
    const isOrgAdmin = memberships?.some(m => m.role === 'OrgAdmin' && m.org_id === report.org_id)

    if (!isContractor && !isOrgAdmin) {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    // 受注者の場合は自分の完了届のみ
    if (isContractor && report.contractor_id !== userProfile.id) {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const updateData: any = {}

    // 許可されたフィールドのみ更新
    if (body.contractor_signed_at && isContractor) {
      updateData.contractor_signed_at = body.contractor_signed_at
    }

    if (body.status) {
      updateData.status = body.status
    }

    if (body.org_signed_at && isOrgAdmin) {
      updateData.org_signed_at = body.org_signed_at
    }

    if (body.approved_at && isOrgAdmin) {
      updateData.approved_at = body.approved_at
    }

    // 更新実行
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from('completion_reports')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        projects!inner(
          id,
          title,
          location,
          category,
          start_date,
          end_date,
          budget
        ),
        contracts!inner(
          id,
          bid_amount,
          start_date,
          end_date,
          signed_at
        ),
        organizations!inner(
          id,
          name
        )
      `)
      .single()

    if (updateError) {
      console.error('完了届更新エラー:', updateError)
      return NextResponse.json({ message: '完了届の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(updatedReport)

  } catch (error) {
    console.error('Completion report update API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id

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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 既存の完了届を取得
    const { data: existingReport, error: fetchError } = await supabaseAdmin
      .from('completion_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !existingReport) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 権限チェック
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    const isContractor = memberships?.some(m => m.role === 'Contractor')
    const isOrgAdmin = memberships?.some(m =>
      m.role === 'OrgAdmin' && m.org_id === existingReport.org_id
    )

    const body = await request.json()
    const { actual_completion_date, status, action } = body

    // アクション別の処理
    if (action === 'approve' && isOrgAdmin) {
      // 発注者による承認
      const { data: updatedReport, error: updateError } = await supabaseAdmin
        .from('completion_reports')
        .update({
          status: 'approved',
          org_signed_at: new Date().toISOString(),
          approved_at: new Date().toISOString()
        })
        .eq('id', reportId)
        .select(`
          *,
          projects!inner(id, title),
          contracts!inner(id),
          organizations!inner(id, name)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ message: '承認に失敗しました' }, { status: 500 })
      }

      // プロジェクトステータスを完了に更新
      await supabaseAdmin
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', existingReport.project_id)

      // 契約ステータスを完了に更新
      await supabaseAdmin
        .from('contracts')
        .update({ status: 'completed' })
        .eq('id', existingReport.contract_id)

      // 受注者に承認通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: existingReport.contractor_id,
          type: 'completion_report_approved',
          title: '業務完了届が承認されました',
          message: `プロジェクト「${updatedReport.projects.title}」の業務完了届が承認されました。`,
          data: {
            project_id: existingReport.project_id,
            completion_report_id: reportId
          }
        })

      return NextResponse.json(updatedReport)

    } else if (action === 'reject' && isOrgAdmin) {
      // 発注者による差し戻し
      const { message: rejectMessage } = body

      const { data: updatedReport, error: updateError } = await supabaseAdmin
        .from('completion_reports')
        .update({
          status: 'rejected'
        })
        .eq('id', reportId)
        .select(`
          *,
          projects!inner(id, title),
          contracts!inner(id),
          organizations!inner(id, name)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ message: '差し戻しに失敗しました' }, { status: 500 })
      }

      // 受注者に差し戻し通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: existingReport.contractor_id,
          type: 'completion_report_rejected',
          title: '業務完了届が差し戻されました',
          message: `プロジェクト「${updatedReport.projects.title}」の業務完了届が差し戻されました。${rejectMessage ? `理由: ${rejectMessage}` : ''}`,
          data: {
            project_id: existingReport.project_id,
            completion_report_id: reportId,
            reject_message: rejectMessage
          }
        })

      return NextResponse.json(updatedReport)

    } else if (existingReport.contractor_id === userProfile.id && existingReport.status === 'draft') {
      // 受注者による更新（下書き状態のみ）
      const updateData: any = {}

      if (actual_completion_date !== undefined) {
        updateData.actual_completion_date = actual_completion_date
      }

      if (status !== undefined) {
        updateData.status = status

        if (status === 'submitted') {
          updateData.submission_date = new Date().toISOString().split('T')[0]
        }
      }

      const { data: updatedReport, error: updateError } = await supabaseAdmin
        .from('completion_reports')
        .update(updateData)
        .eq('id', reportId)
        .select(`
          *,
          projects!inner(id, title, org_id),
          contracts!inner(id),
          organizations!inner(id, name)
        `)
        .single()

      if (updateError) {
        return NextResponse.json({ message: '更新に失敗しました' }, { status: 500 })
      }

      // 提出時は発注者に通知
      if (status === 'submitted') {
        const { data: orgAdmins } = await supabaseAdmin
          .from('memberships')
          .select('user_id')
          .eq('org_id', updatedReport.projects.org_id)
          .eq('role', 'OrgAdmin')

        if (orgAdmins && orgAdmins.length > 0) {
          const notifications = orgAdmins.map(admin => ({
            user_id: admin.user_id,
            type: 'completion_report_submitted',
            title: '業務完了届が提出されました',
            message: `プロジェクト「${updatedReport.projects.title}」の業務完了届が提出されました。確認をお願いします。`,
            data: {
              project_id: existingReport.project_id,
              completion_report_id: reportId,
              contractor_id: userProfile.id,
              contractor_name: userProfile.display_name
            }
          }))

          await supabaseAdmin
            .from('notifications')
            .insert(notifications)
        }
      }

      return NextResponse.json(updatedReport)

    } else {
      return NextResponse.json({ message: '更新権限がありません' }, { status: 403 })
    }

  } catch (error) {
    console.error('Completion report update API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id

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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 既存の完了届を取得
    const { data: existingReport, error: fetchError } = await supabaseAdmin
      .from('completion_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (fetchError || !existingReport) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 権限チェック：自分の完了届で、下書き状態のみ削除可能
    if (existingReport.contractor_id !== userProfile.id) {
      return NextResponse.json({ message: '削除権限がありません' }, { status: 403 })
    }

    if (existingReport.status !== 'draft') {
      return NextResponse.json({ message: '提出済みの完了届は削除できません' }, { status: 400 })
    }

    // 完了届を削除
    const { error: deleteError } = await supabaseAdmin
      .from('completion_reports')
      .delete()
      .eq('id', reportId)

    if (deleteError) {
      return NextResponse.json({ message: '削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ message: '完了届を削除しました' })

  } catch (error) {
    console.error('Completion report delete API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}