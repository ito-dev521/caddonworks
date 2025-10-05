import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

/**
 * 月次請求の集計APIエンドポイント
 * 指定された年月（または当月）の完了案件を組織ごとに集計
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)

    // クエリパラメータから年月を取得（デフォルトは当月）
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

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
      console.error('ユーザープロフィール取得エラー:', {
        auth_user_id: user.id,
        email: user.email,
        error: userProfileError,
        userProfile
      })
      return NextResponse.json({
        message: 'ユーザープロフィールが見つかりません',
        details: {
          auth_user_id: user.id,
          email: user.email,
          error: userProfileError?.message
        }
      }, { status: 403 })
    }

    // 運営者（Admin）のみ実行可能
    if (userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '運営者のみアクセスできます' }, { status: 403 })
    }

    // システム設定（サポート手数料％）を取得
    const { data: sysSettings } = await supabase
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()
    const supportPercent = Number(sysSettings?.support_fee_percent ?? 8)

    // 対象期間を計算（前月21日 〜 当月20日）
    const billingStartDate = new Date(year, month - 2, 21) // 前月21日
    const billingEndDate = new Date(year, month - 1, 20, 23, 59, 59) // 当月20日の23:59:59

    console.log('📅 集計期間:', {
      year,
      month,
      start: billingStartDate.toISOString(),
      end: billingEndDate.toISOString()
    })

    // 対象期間内の完了届を取得
    const { data: completionReports, error: reportsError } = await supabase
      .from('completion_reports')
      .select(`
        id,
        project_id,
        contract_id,
        actual_completion_date,
        created_at,
        projects:project_id (
          id,
          title,
          org_id,
          contractor_id,
          support_enabled,
          organizations:org_id (
            id,
            name,
            address,
            email
          )
        ),
        contracts:contract_id (
          id,
          bid_amount,
          support_enabled
        )
      `)
      .gte('actual_completion_date', billingStartDate.toISOString().split('T')[0])
      .lte('actual_completion_date', billingEndDate.toISOString().split('T')[0])
      .order('actual_completion_date', { ascending: true })

    if (reportsError) {
      console.error('完了届取得エラー:', reportsError)
      return NextResponse.json({
        message: '完了届の取得に失敗しました',
        error: reportsError.message
      }, { status: 500 })
    }

    // 組織ごとに集計
    const organizationSummaries = new Map<string, {
      org_id: string
      org_name: string
      org_address: string
      org_email: string
      projects: Array<{
        project_id: string
        project_title: string
        contract_id: string
        contract_amount: number
        completion_date: string
        support_enabled: boolean
        support_fee: number
        system_fee: number
      }>
      total_contract_amount: number
      total_support_fee: number
      total_system_fee: number
      total_billing_amount: number
    }>()

    // 完了届を組織ごとに集計
    for (const report of completionReports || []) {
      const orgId = report.projects?.org_id
      if (!orgId) continue

      const contractAmount = report.contracts?.bid_amount || 0
      // 発注者サポート利用のみを請求（受注者サポートは受注者支払い時に差し引く）
      const projectSupportEnabled = report.projects?.support_enabled || false
      const supportFee = projectSupportEnabled ? Math.round((contractAmount * supportPercent) / 100) : 0
      const systemFee = Math.round((contractAmount * 30) / 100)

      if (!organizationSummaries.has(orgId)) {
        organizationSummaries.set(orgId, {
          org_id: orgId,
          org_name: report.projects?.organizations?.name || '',
          org_address: report.projects?.organizations?.address || '',
          org_email: report.projects?.organizations?.email || '',
          projects: [],
          total_contract_amount: 0,
          total_support_fee: 0,
          total_system_fee: 0,
          total_billing_amount: 0
        })
      }

      const summary = organizationSummaries.get(orgId)!
      summary.projects.push({
        project_id: report.project_id,
        project_title: report.projects?.title || '',
        contract_id: report.contract_id,
        contract_amount: contractAmount,
        completion_date: report.actual_completion_date,
        support_enabled: projectSupportEnabled,
        support_fee: supportFee,
        system_fee: systemFee
      })

      summary.total_contract_amount += contractAmount
      summary.total_support_fee += supportFee
      summary.total_system_fee += systemFee
      summary.total_billing_amount = summary.total_contract_amount + summary.total_support_fee + summary.total_system_fee
    }

    // Map を配列に変換
    const summaries = Array.from(organizationSummaries.values())

    return NextResponse.json({
      billing_period: {
        year,
        month,
        start_date: billingStartDate.toISOString().split('T')[0],
        end_date: billingEndDate.toISOString().split('T')[0],
        label: `${year}年${month}月分（${month - 1}月21日〜${month}月20日締め）`
      },
      support_fee_percent: supportPercent,
      total_organizations: summaries.length,
      total_projects: completionReports?.length || 0,
      grand_total_amount: summaries.reduce((sum, s) => sum + s.total_billing_amount, 0),
      grand_total_support_fee: summaries.reduce((sum, s) => sum + s.total_support_fee, 0),
      grand_total_system_fee: summaries.reduce((sum, s) => sum + s.total_system_fee, 0),
      organizations: summaries.sort((a, b) => b.total_billing_amount - a.total_billing_amount)
    }, { status: 200 })

  } catch (error) {
    console.error('月次集計エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
