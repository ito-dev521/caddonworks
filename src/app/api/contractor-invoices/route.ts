import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseAdmin = createSupabaseAdmin()

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // Contractorロールを確認
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)
      .eq('role', 'Contractor')
      .maybeSingle()

    if (!membership) {
      return NextResponse.json({ message: '受注者権限が必要です' }, { status: 403 })
    }

    const body = await request.json()
    const { org_id, month, completion_report_ids } = body

    if (!org_id || !month || !completion_report_ids || completion_report_ids.length === 0) {
      return NextResponse.json({ message: '必要なパラメータが不足しています' }, { status: 400 })
    }

    // 業務完了届を取得
    const { data: reports, error: reportsError } = await supabaseAdmin
      .from('completion_reports')
      .select(`
        id,
        project_id,
        contract_id,
        actual_completion_date,
        projects(id, title, org_id, support_enabled, organizations(id, name)),
        contracts(id, bid_amount, contractor_id, support_enabled)
      `)
      .in('id', completion_report_ids)

    console.log('業務完了届クエリ結果:', { reports, reportsError, completion_report_ids })

    if (reportsError) {
      console.error('業務完了届取得エラー:', reportsError)
      return NextResponse.json({
        message: '業務完了届の取得に失敗しました',
        error: reportsError.message
      }, { status: 500 })
    }

    if (!reports || reports.length === 0) {
      return NextResponse.json({
        message: '業務完了届が見つかりません',
        detail: `contractor_id: ${userProfile.id}, completion_report_ids: ${completion_report_ids.join(', ')}`
      }, { status: 404 })
    }

    // 受注者の確認
    const invalidReports = reports.filter((r: any) => {
      const contractorId = r.contracts?.contractor_id
      return contractorId && contractorId !== userProfile.id
    })

    if (invalidReports.length > 0) {
      console.error('権限のない業務完了届:', invalidReports)
      return NextResponse.json({
        message: '権限のない業務完了届が含まれています',
        detail: `あなたのID: ${userProfile.id}, 不正な完了届: ${invalidReports.map((r: any) => r.id).join(', ')}`
      }, { status: 403 })
    }

    // システム設定からサポート手数料率を取得
    const { data: sysSettings } = await supabaseAdmin
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()
    const supportPercent = Number(sysSettings?.support_fee_percent ?? 8)

    // 集計計算
    let totalContractAmount = 0
    let totalSupportFee = 0
    let totalSubtotal = 0
    let totalWithholding = 0

    const calculateWithholding = (amount: number) => {
      if (amount <= 1000000) {
        return Math.floor(amount * 0.1021)
      } else {
        return Math.floor((amount - 1000000) * 0.2042 + 102100)
      }
    }

    reports.forEach((report: any) => {
      const contractAmount = report.contracts?.bid_amount || 0
      // 受注者サポート利用（contract.support_enabled = true）の場合のみ、受注者がサポート料を支払う
      const isContractorSupport = report.contracts?.support_enabled || false
      const supportFee = isContractorSupport ? Math.round((contractAmount * supportPercent) / 100) : 0
      const subtotal = contractAmount - supportFee
      const withholding = calculateWithholding(subtotal)

      totalContractAmount += contractAmount
      totalSupportFee += supportFee
      totalSubtotal += subtotal
      totalWithholding += withholding
    })

    const totalFinalAmount = totalSubtotal - totalWithholding

    // 請求書番号を生成
    const invoiceNumber = `CINV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // 請求書データを作成
    const [year, monthNum] = month.split('-').map(Number)
    const issueDate = new Date(year, monthNum - 1, 1).toISOString().split('T')[0]
    const dueDate = new Date(year, monthNum, 0).toISOString().split('T')[0] // 月末

    // invoicesテーブルのスキーマを確認して、存在する列のみ使用
    const invoiceData: any = {
      contractor_id: userProfile.id,
      org_id: org_id,
      project_id: reports[0]?.project_id, // 最初のプロジェクトIDを使用
      base_amount: totalSubtotal,
      system_fee: totalSupportFee,
      total_amount: totalFinalAmount,
      status: 'issued',
      issue_date: issueDate,
      due_date: dueDate
    }

    // オプション列を追加（存在する場合のみ）
    try {
      // invoice_number列が存在するかチェック
      const { error: probeError } = await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .limit(0)
      if (!probeError) {
        invoiceData.invoice_number = invoiceNumber
      }
    } catch (_) {
      // 列が存在しない場合はスキップ
    }

    try {
      // contract_id列が存在するかチェック
      const { error: probeError } = await supabaseAdmin
        .from('invoices')
        .select('contract_id')
        .limit(0)
      if (!probeError) {
        invoiceData.contract_id = reports[0]?.contract_id
      }
    } catch (_) {
      // 列が存在しない場合はスキップ
    }

    try {
      // direction列が存在するかチェック
      const { error: probeError } = await supabaseAdmin
        .from('invoices')
        .select('direction')
        .limit(0)
      if (!probeError) {
        invoiceData.direction = 'to_operator'
      }
    } catch (_) {
      // 列が存在しない場合はスキップ
    }

    try {
      // memo列が存在するかチェック
      const { error: probeError } = await supabaseAdmin
        .from('invoices')
        .select('memo')
        .limit(0)
      if (!probeError) {
        invoiceData.memo = `${month}分 受注者請求 (${reports.length}件の業務完了届)`
      }
    } catch (_) {
      // 列が存在しない場合はスキップ
    }

    // 請求書を保存
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      console.error('請求書作成エラー:', invoiceError)
      return NextResponse.json({
        message: '請求書の作成に失敗しました',
        error: invoiceError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: '請求書を作成しました',
      invoice: invoice
    }, { status: 201 })

  } catch (error) {
    console.error('受注者請求書作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
