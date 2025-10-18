import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 受注者ごとの月次請求集計
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    const auth = request.headers.get('authorization')
    if (!auth) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証失敗' }, { status: 401 })

    // Adminメール or membershipsでAdminを許可
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',').map(e=>e.trim().toLowerCase())
    let isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false
    if (!isAdmin) {
      const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (profile) {
        const { data: mem } = await supabase.from('memberships').select('role').eq('user_id', profile.id).eq('role','Admin').maybeSingle()
        if (mem) isAdmin = true
      }
    }
    if (!isAdmin) return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    if (!year || !month) {
      return NextResponse.json({ message: '年と月を指定してください' }, { status: 400 })
    }

    // 対象月の開始日と終了日を計算
    const startDate = `${year}-${month.padStart(2, '0')}-01`
    const nextMonth = parseInt(month) === 12 ? 1 : parseInt(month) + 1
    const nextYear = parseInt(month) === 12 ? parseInt(year) + 1 : parseInt(year)
    const endDate = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`

    // 対象月に発行された受注者からの請求書を取得
    const { data: invoices, error } = await supabase
      .from('invoices')
      .select(`
        id,
        status,
        issue_date,
        total_amount,
        base_amount,
        fee_amount,
        contractor_id,
        users:contractor_id ( id, display_name, email ),
        projects:project_id ( id, title ),
        organizations:org_id ( id, name )
      `)
      .not('contractor_id', 'is', null)
      .gte('issue_date', startDate)
      .lt('issue_date', endDate)
      .order('contractor_id')

    if (error) {
      console.error('請求書取得エラー:', error)
      return NextResponse.json({ message: '取得失敗', error }, { status: 500 })
    }

    // 源泉徴収税を計算
    const calculateWithholding = (amount: number) => {
      if (amount <= 1000000) {
        return Math.floor(amount * 0.1021)
      } else {
        return Math.floor((amount - 1000000) * 0.2042 + 102100)
      }
    }

    // 受注者ごとに集計
    const contractorMap = new Map<string, {
      contractor_id: string
      contractor_name: string
      contractor_email: string
      invoice_count: number
      total_amount: number
      total_base_amount: number
      total_fee_amount: number
      total_withholding: number
      invoices: Array<{
        id: string
        invoice_number: string
        issue_date: string
        project_title: string
        client_org_name: string
        base_amount: number
        fee_amount: number
        subtotal: number
        withholding: number
        final_amount: number
        status: string
      }>
    }>()

    invoices?.forEach((invoice: any) => {
      const contractorId = invoice.contractor_id
      const contractorName = invoice.users?.display_name || '不明な受注者'
      const contractorEmail = invoice.users?.email || ''

      if (!contractorMap.has(contractorId)) {
        contractorMap.set(contractorId, {
          contractor_id: contractorId,
          contractor_name: contractorName,
          contractor_email: contractorEmail,
          invoice_count: 0,
          total_amount: 0,
          total_base_amount: 0,
          total_fee_amount: 0,
          total_withholding: 0,
          invoices: []
        })
      }

      // 各請求書の金額計算
      const baseAmount = invoice.base_amount || 0  // 契約金額
      const feeAmount = invoice.fee_amount || 0    // サポート利用料
      const subtotal = invoice.total_amount || 0   // 小計（契約金額 - サポート料）
      const withholding = calculateWithholding(subtotal)  // 源泉税
      const finalAmount = subtotal - withholding   // 最終請求額

      const summary = contractorMap.get(contractorId)!
      summary.invoice_count += 1
      summary.total_amount += finalAmount  // 最終請求額を集計
      summary.total_base_amount += baseAmount
      summary.total_fee_amount += feeAmount
      summary.total_withholding += withholding
      summary.invoices.push({
        id: invoice.id,
        invoice_number: `CINV-${String(invoice.id).slice(0,8).toUpperCase()}`,
        issue_date: invoice.issue_date,
        project_title: invoice.projects?.title || '不明',
        client_org_name: invoice.organizations?.name || '不明',
        base_amount: baseAmount,
        fee_amount: feeAmount,
        subtotal: subtotal,
        withholding: withholding,
        final_amount: finalAmount,
        status: invoice.status
      })
    })

    const summaries = Array.from(contractorMap.values())

    return NextResponse.json({
      year,
      month,
      summaries,
      total_contractors: summaries.length,
      total_invoices: summaries.reduce((sum, s) => sum + s.invoice_count, 0),
      grand_total: summaries.reduce((sum, s) => sum + s.total_amount, 0)
    }, { status: 200 })

  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}
