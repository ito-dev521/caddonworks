import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(request: NextRequest) {
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

    // ユーザーの権限を確認
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const projectId = searchParams.get('project_id')

    let query = supabaseAdmin
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

    // 受注者の場合：自分の完了届のみ
    const isContractor = memberships.some(m => m.role === 'Contractor')
    if (isContractor) {
      query = query.eq('contractor_id', userProfile.id)
    } else {
      // 発注者の場合：自分の組織の完了届のみ
      const orgIds = memberships.map(m => m.org_id)
      query = query.in('org_id', orgIds)
    }

    // プロジェクト指定があれば絞り込み
    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: reports, error } = await query.order('created_at', { ascending: false })

    if (error) {
      // テーブルが存在しない場合は空配列を返す
      if (error.message?.includes('completion_reports') || error.message?.includes('does not exist')) {
        return NextResponse.json([])
      }
      return NextResponse.json({ message: 'データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(reports || [])

  } catch (error) {
    console.error('Completion reports API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // 発注者権限をチェック（業務完了届は発注者が作成）
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    const isOrderer = memberships?.some(m => m.role === 'OrgAdmin' || m.role === 'Staff')
    if (!isOrderer) {
      return NextResponse.json({ message: '発注者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { project_id, contract_id, actual_completion_date, status = 'draft' } = body

    // 必須フィールドの検証
    if (!project_id || !contract_id || !actual_completion_date) {
      return NextResponse.json({ message: '必須フィールドが不足しています' }, { status: 400 })
    }

    // プロジェクトと契約の存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, org_id, contractor_id, title')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('id, contractor_id')
      .eq('id', contract_id)
      .eq('project_id', project_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // 権限チェック：発注者は自分の組織が発注したプロジェクトの完了届のみ作成可能
    const userOrgId = memberships?.[0]?.org_id
    if (project.org_id !== userOrgId) {
      return NextResponse.json({ message: 'この案件の完了届を作成する権限がありません' }, { status: 403 })
    }

    // 既存の完了届チェック（テーブルが存在しない場合はスキップ）
    try {
      const { data: existingReport } = await supabaseAdmin
        .from('completion_reports')
        .select('id')
        .eq('project_id', project_id)
        .single()

      if (existingReport) {
        return NextResponse.json({
          message: 'このプロジェクトの完了届は既に存在します',
          alreadyExists: true
        }, { status: 409 })
      }
    } catch (error: any) {
      // テーブルが存在しない場合のエラーハンドリング
      if (error.code === 'PGRST204' || error.message?.includes('does not exist')) {
        return NextResponse.json({
          message: 'データベースが準備されていません。管理者にお問い合わせください。',
          error: 'completion_reports テーブルが存在しません'
        }, { status: 500 })
      }
    }

    // 完了届データの準備（発注者が作成する場合は契約の受注者IDを使用）
    const reportData = {
      project_id,
      contract_id,
      contractor_id: contract.contractor_id, // 契約の受注者ID
      org_id: project.org_id,
      actual_completion_date,
      status,
      submission_date: status === 'submitted' ? new Date().toISOString().split('T')[0] : null
    }

    // 完了届を作成
    const { data: newReport, error: insertError } = await supabaseAdmin
      .from('completion_reports')
      .insert(reportData)
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

    if (insertError) {
      // テーブルが存在しない場合のエラーハンドリング
      if (insertError.message?.includes('completion_reports') || insertError.message?.includes('does not exist')) {
        return NextResponse.json({ message: 'データベースが準備されていません。管理者にお問い合わせください。' }, { status: 503 })
      }
      return NextResponse.json({ message: '完了届の作成に失敗しました' }, { status: 500 })
    }

    // 提出時は発注者・受注者それぞれに通知
    if (status === 'submitted') {
      const { data: orgAdmins } = await supabaseAdmin
        .from('memberships')
        .select('user_id')
        .eq('org_id', project.org_id)
        .eq('role', 'OrgAdmin')

      if (orgAdmins && orgAdmins.length > 0) {
        const notifications = orgAdmins.map(admin => ({
          user_id: admin.user_id,
          type: 'completion_report_submitted',
          title: '業務完了届が提出されました',
          message: `プロジェクト「${project.title}」の業務完了届が提出されました。確認をお願いします。`,
          data: {
            project_id,
            completion_report_id: newReport.id,
            contractor_id: userProfile.id,
            contractor_name: userProfile.display_name
          }
        }))

        await supabaseAdmin
          .from('notifications')
          .insert(notifications)
      }

      // 受注者への通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: contract.contractor_id,
          type: 'completion_report_created',
          title: '業務完了届が発行されました',
          message: `プロジェクト「${project.title}」の業務完了届が発行されました。内容を確認してください。`,
          data: {
            project_id,
            completion_report_id: newReport.id,
            org_id: project.org_id
          }
        })
    }

    return NextResponse.json(newReport, { status: 201 })

  } catch (error) {
    console.error('Completion report creation API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}