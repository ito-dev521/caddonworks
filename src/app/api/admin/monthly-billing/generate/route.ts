import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

/**
 * 月次請求書一括生成API
 * 指定された年月の完了案件をもとに、組織ごとの請求書を一括生成
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const body = await request.json()
    const { year, month } = body

    if (!year || !month) {
      return NextResponse.json({
        message: '年と月を指定してください'
      }, { status: 400 })
    }

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
      return NextResponse.json({ message: '運営者のみ実行できます' }, { status: 403 })
    }

    // 集計APIから集計データを取得
    const summaryResponse = await fetch(
      `${request.nextUrl.origin}/api/admin/monthly-billing/summary?year=${year}&month=${month}`,
      {
        headers: {
          'Authorization': authHeader
        }
      }
    )

    if (!summaryResponse.ok) {
      throw new Error('集計データの取得に失敗しました')
    }

    const summaryData = await summaryResponse.json()
    const { organizations, billing_period } = summaryData

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        message: '対象期間内に完了案件がありません'
      }, { status: 400 })
    }

    const createdInvoices: any[] = []
    const errors: any[] = []

    // 組織ごとに請求書を生成
    for (const org of organizations) {
      try {
        // 既存の請求書をチェック
        const { data: existingInvoice } = await supabase
          .from('invoices')
          .select('id')
          .eq('org_id', org.org_id)
          .eq('direction', 'to_operator')
          .eq('billing_year', year)
          .eq('billing_month', month)
          .maybeSingle()

        if (existingInvoice) {
          errors.push({
            org_id: org.org_id,
            org_name: org.org_name,
            error: '既に請求書が作成済みです',
            invoice_id: existingInvoice.id
          })
          continue
        }

        // 請求書番号を生成
        const invoiceNumber = `INV-${year}${String(month).padStart(2, '0')}-${org.org_id.slice(0, 8).toUpperCase()}`

        // プロジェクトリストをJSON形式で保存
        const projectList = org.projects.map((p: any) => ({
          project_id: p.project_id,
          project_title: p.project_title,
          contract_id: p.contract_id,
          contract_amount: p.contract_amount,
          completion_date: p.completion_date,
          support_enabled: p.support_enabled,
          support_fee: p.support_fee,
          system_fee: p.system_fee
        }))

        // 請求書を作成
        const { data: invoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            org_id: org.org_id,
            invoice_number: invoiceNumber,
            direction: 'to_operator',
            billing_year: year,
            billing_month: month,
            billing_period: billing_period.label,
            base_amount: org.total_contract_amount,
            fee_amount: org.total_support_fee,
            system_fee: org.total_system_fee,
            total_amount: org.total_billing_amount,
            project_list: projectList,
            status: 'issued',
            issue_date: new Date().toISOString().split('T')[0],
            due_date: new Date(year, month, 10).toISOString().split('T')[0], // 翌月10日
            memo: `${billing_period.label} 完了案件 ${org.projects.length}件`
          })
          .select()
          .single()

        if (invoiceError) {
          errors.push({
            org_id: org.org_id,
            org_name: org.org_name,
            error: invoiceError.message
          })
          continue
        }

        createdInvoices.push({
          org_id: org.org_id,
          org_name: org.org_name,
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          total_amount: invoice.total_amount,
          project_count: org.projects.length
        })

        // 組織の管理者に通知を送信
        const { data: orgAdmins } = await supabase
          .from('memberships')
          .select('user_id')
          .eq('org_id', org.org_id)
          .eq('role', 'OrgAdmin')

        if (orgAdmins && orgAdmins.length > 0) {
          const notifications = orgAdmins.map(admin => ({
            user_id: admin.user_id,
            title: '月次請求書が発行されました',
            message: `${billing_period.label}の請求書が発行されました。合計金額: ¥${org.total_billing_amount.toLocaleString()}`,
            type: 'monthly_invoice_issued',
            data: {
              invoice_id: invoice.id,
              billing_year: year,
              billing_month: month,
              total_amount: org.total_billing_amount
            }
          }))

          await supabase.from('notifications').insert(notifications)
        }

      } catch (error: any) {
        errors.push({
          org_id: org.org_id,
          org_name: org.org_name,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      message: '月次請求書の一括生成が完了しました',
      billing_period: billing_period.label,
      summary: {
        total_organizations: organizations.length,
        created_invoices: createdInvoices.length,
        errors: errors.length
      },
      created_invoices: createdInvoices,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 201 })

  } catch (error) {
    console.error('月次請求書生成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
