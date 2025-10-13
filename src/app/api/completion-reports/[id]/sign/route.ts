import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(
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

    const reportId = params.id

    // 完了届を取得
    const { data: report, error: reportError } = await supabaseAdmin
      .from('completion_reports')
      .select('*')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 受注者権限をチェック
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)

    const isContractor = memberships?.some(m => m.role === 'Contractor')
    if (!isContractor || report.contractor_id !== userProfile.id) {
      return NextResponse.json({ message: 'この完了届に署名する権限がありません' }, { status: 403 })
    }

    // 既に署名済みかチェック
    if (report.contractor_signed_at) {
      return NextResponse.json({ message: '既に署名済みです' }, { status: 409 })
    }

    // 署名を記録
    const now = new Date().toISOString()
    const { data: updatedReport, error: updateError } = await supabaseAdmin
      .from('completion_reports')
      .update({
        contractor_signed_at: now,
        approved_at: now, // 承認日も同時に記録
        status: 'approved' // 受注者が署名したら承認済みに
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('完了届署名エラー:', updateError)
      return NextResponse.json({ message: '署名に失敗しました' }, { status: 500 })
    }

    // 発注者への通知
    const { data: orgAdmins } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('org_id', report.org_id)
      .eq('role', 'OrgAdmin')

    if (orgAdmins && orgAdmins.length > 0) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('title')
        .eq('id', report.project_id)
        .single()

      const notifications = orgAdmins.map(admin => ({
        user_id: admin.user_id,
        type: 'completion_report_signed',
        title: '業務完了届が署名されました',
        message: `プロジェクト「${project?.title || ''}」の業務完了届に受注者が署名しました。`,
        data: {
          project_id: report.project_id,
          completion_report_id: reportId,
          contractor_id: userProfile.id
        }
      }))

      await supabaseAdmin
        .from('notifications')
        .insert(notifications)
    }

    return NextResponse.json({
      message: '署名が完了しました',
      report: updatedReport
    })

  } catch (error) {
    console.error('Completion report sign API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
