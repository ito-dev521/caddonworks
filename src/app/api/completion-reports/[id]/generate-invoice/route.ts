import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseAdmin()
    const completionReportId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 運営者（Admin）のみ実行可能
    if (userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '運営者のみ請求書を生成できます' }, { status: 403 })
    }

    // 完了届を取得
    const { data: completionReport, error: reportError } = await supabase
      .from('completion_reports')
      .select(`
        id,
        project_id,
        contract_id,
        completion_date,
        created_at,
        projects:project_id (
          id,
          title,
          org_id,
          contractor_id,
          organizations:org_id (
            id,
            name,
            address,
            phone,
            email
          )
        ),
        contracts:contract_id (
          id,
          bid_amount,
          support_enabled
        )
      `)
      .eq('id', completionReportId)
      .single()

    if (reportError || !completionReport) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 既に請求書が作成されているかチェック
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('contract_id', completionReport.contract_id)
      .eq('direction', 'from_operator')
      .maybeSingle()

    if (existingInvoice) {
      return NextResponse.json({
        message: 'この完了届の請求書は既に作成済みです',
        invoice_id: existingInvoice.id
      }, { status: 400 })
    }

    // システム設定（サポート手数料％）を取得
    const { data: sysSettings } = await supabase
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()
    const supportPercent = Number(sysSettings?.support_fee_percent ?? 8)

    // 契約金額とサポート手数料を計算
    const contractAmount = completionReport.contracts?.bid_amount || 0
    const supportEnabled = completionReport.contracts?.support_enabled || false
    const supportFee = supportEnabled ? Math.round((contractAmount * supportPercent) / 100) : 0
    const baseAmount = contractAmount
    const totalAmount = baseAmount + supportFee

    // 請求書番号を生成
    const invoiceNumber = `INV-OP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // 運営者向け請求書を作成
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        project_id: completionReport.project_id,
        contract_id: completionReport.contract_id,
        contractor_id: completionReport.projects?.contractor_id,
        org_id: completionReport.projects?.org_id,
        invoice_number: invoiceNumber,
        direction: 'from_operator', // 運営者から発注者への請求
        base_amount: baseAmount,
        system_fee: supportFee,
        total_amount: totalAmount,
        status: 'issued',
        issue_date: new Date().toISOString().split('T')[0],
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日後
        memo: supportEnabled ? `サポート手数料 ${supportPercent}% を含む` : null
      })
      .select()
      .single()

    if (invoiceError) {
      console.error('請求書作成エラー:', invoiceError)
      return NextResponse.json({
        message: '請求書の作成に失敗しました',
        error: invoiceError.message
      }, { status: 500 })
    }

    // 発注者組織の管理者に通知を送信
    const { data: orgAdmins } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', completionReport.projects?.org_id)
      .eq('role', 'OrgAdmin')

    if (orgAdmins && orgAdmins.length > 0) {
      const notifications = orgAdmins.map(admin => ({
        user_id: admin.user_id,
        title: '請求書が発行されました',
        message: `プロジェクト「${completionReport.projects?.title}」の請求書が発行されました。`,
        type: 'invoice_issued',
        data: {
          project_id: completionReport.project_id,
          invoice_id: invoice.id,
          completion_report_id: completionReportId
        }
      }))

      const { error: notificationError } = await supabase
        .from('notifications')
        .insert(notifications)

      if (notificationError) {
        console.error('通知作成エラー:', notificationError)
      }
    }

    return NextResponse.json({
      message: '運営者向け請求書が作成されました',
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: invoice.total_amount,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date
      },
      pdf_url: `/api/invoices/${invoice.id}/pdf`
    }, { status: 201 })

  } catch (error) {
    console.error('請求書生成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
