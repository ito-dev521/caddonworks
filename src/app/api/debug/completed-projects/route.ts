import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 1. 完了案件の一覧を取得
    const { data: completedProjects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        status,
        budget,
        contractor_id,
        org_id,
        created_at,
        updated_at
      `)
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })

    // 2. 各完了案件の関連データを取得
    const projectsWithDetails = await Promise.all(
      (completedProjects || []).map(async (project) => {
        // 契約情報
        const { data: contract } = await supabaseAdmin
          .from('contracts')
          .select('id, status, bid_amount, signed_at')
          .eq('project_id', project.id)
          .single()

        // 請求書情報
        const { data: invoices } = await supabaseAdmin
          .from('invoices')
          .select('id, invoice_number, amount, status, issue_date')
          .eq('project_id', project.id)

        // 受注者情報
        const { data: contractor } = await supabaseAdmin
          .from('users')
          .select('display_name, email')
          .eq('id', project.contractor_id)
          .single()

        // 発注者組織情報
        const { data: organization } = await supabaseAdmin
          .from('organizations')
          .select('name, email')
          .eq('id', project.org_id)
          .single()

        return {
          ...project,
          contract,
          invoices: invoices || [],
          contractor,
          organization
        }
      })
    )

    // 3. 統計情報
    const stats = {
      totalCompleted: completedProjects?.length || 0,
      withContracts: projectsWithDetails.filter(p => p.contract).length,
      withInvoices: projectsWithDetails.filter(p => p.invoices.length > 0).length,
      totalBudget: projectsWithDetails.reduce((sum, p) => sum + (p.budget || 0), 0),
      totalInvoiced: projectsWithDetails.reduce((sum, p) => 
        sum + p.invoices.reduce((invoiceSum, inv) => invoiceSum + (inv.amount || 0), 0), 0
      )
    }

    return NextResponse.json({
      projects: projectsWithDetails,
      stats,
      projectsError
    }, { status: 200 })

  } catch (error) {
    console.error('Completed projects debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
