export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // 認証確認（Vercel Cron または指定されたAPIキーからのみ許可）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    const isManual = request.headers.get('x-manual-trigger') === 'true'

    // 手動実行でない場合は21日かどうかチェック
    if (!isManual && today.getDate() !== 21) {
      return NextResponse.json({
        message: 'Not the 21st of the month',
        date: today.toISOString()
      })
    }

    console.log('🔄 月次請求書生成処理開始:', {
      date: today.toISOString(),
      manual: isManual
    })

    // 前月の年月を計算（20日締めなので前月分）
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const billingYear = lastMonth.getFullYear()
    const billingMonth = lastMonth.getMonth() + 1

    console.log(`📅 対象請求期間: ${billingYear}年${billingMonth}月`)

    // 1. 前月（1日〜20日）に完了したプロジェクトを取得
    const fromDate = new Date(billingYear, billingMonth - 1, 1) // 前月1日
    const toDate = new Date(billingYear, billingMonth - 1, 21) // 前月20日（21日は含まない）

    const { data: completedProjects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        amount,
        completed_at,
        contracts!inner(
          id,
          contractor_id,
          contractor:users!contracts_contractor_id_fkey(id, name, email)
        )
      `)
      .eq('status', 'completed')
      .gte('completed_at', fromDate.toISOString())
      .lt('completed_at', toDate.toISOString())

    if (projectsError) {
      console.error('❌ 完了プロジェクト取得エラー:', projectsError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log(`📋 対象プロジェクト数: ${completedProjects?.length || 0}`)

    if (!completedProjects || completedProjects.length === 0) {
      return NextResponse.json({
        message: 'No completed projects found for billing period',
        billingPeriod: `${billingYear}-${billingMonth.toString().padStart(2, '0')}`
      })
    }

    // 2. 受注者別にグループ化
    const contractorGroups = new Map<string, { contractor: any; projects: any[] }>()

    completedProjects.forEach(project => {
      const contractor = project.contracts[0]?.contractor
      if (!contractor) return

      const contractorId = (contractor as any).id
      if (!contractorGroups.has(contractorId)) {
        contractorGroups.set(contractorId, {
          contractor,
          projects: []
        })
      }

      contractorGroups.get(contractorId)!.projects.push(project)
    })

    console.log(`👥 対象受注者数: ${contractorGroups.size}`)

    const results = []

    // 3. 各受注者の月次請求書を作成
    for (const [contractorId, group] of Array.from(contractorGroups.entries())) {
      try {
        // システム利用料計算（各プロジェクト金額の10%）
        const projectsData = group.projects.map((project: any) => ({
          project_id: project.id,
          project_title: project.title,
          project_amount: project.amount,
          completion_date: project.completed_at,
          system_fee: Math.floor(project.amount * 0.1) // 10%のシステム利用料
        }))

        const systemFeeTotal = projectsData.reduce((sum: number, p: any) => sum + p.system_fee, 0)

        // 既存の請求書チェック
        const { data: existingInvoice } = await supabaseAdmin
          .from('monthly_invoices')
          .select('id')
          .eq('contractor_id', contractorId)
          .eq('billing_year', billingYear)
          .eq('billing_month', billingMonth)
          .single()

        if (existingInvoice) {
          console.log(`⚠️ 既存請求書スキップ: ${group.contractor.name} (${billingYear}/${billingMonth})`)
          results.push({
            contractorId,
            contractorName: group.contractor.name,
            status: 'skipped',
            reason: 'Already exists'
          })
          continue
        }

        // 月次請求書作成
        const { data: invoice, error: invoiceError } = await supabaseAdmin
          .from('monthly_invoices')
          .insert({
            contractor_id: contractorId,
            billing_year: billingYear,
            billing_month: billingMonth,
            system_fee_total: systemFeeTotal,
            status: 'draft', // 初期状態はdraft
            created_at: new Date().toISOString()
          })
          .select()
          .single()

        if (invoiceError) {
          console.error(`❌ 請求書作成エラー (${group.contractor.name}):`, invoiceError)
          results.push({
            contractorId,
            contractorName: group.contractor.name,
            status: 'error',
            error: invoiceError.message
          })
          continue
        }

        // プロジェクト詳細を関連付け
        const { error: projectsError } = await supabaseAdmin
          .from('monthly_invoice_projects')
          .insert(
            projectsData.map((p: any) => ({
              ...p,
              monthly_invoice_id: invoice.id
            }))
          )

        if (projectsError) {
          console.error(`❌ プロジェクト関連付けエラー (${group.contractor.name}):`, projectsError)
          // 請求書を削除（ロールバック）
          await supabaseAdmin
            .from('monthly_invoices')
            .delete()
            .eq('id', invoice.id)

          results.push({
            contractorId,
            contractorName: group.contractor.name,
            status: 'error',
            error: projectsError.message
          })
          continue
        }

        console.log(`✅ 請求書作成完了: ${group.contractor.name} (¥${systemFeeTotal.toLocaleString()})`)

        results.push({
          contractorId,
          contractorName: group.contractor.name,
          invoiceId: invoice.id,
          projectCount: group.projects.length,
          systemFeeTotal,
          status: 'created'
        })

      } catch (error: any) {
        console.error(`❌ 請求書処理エラー (${group.contractor.name}):`, error)
        results.push({
          contractorId,
          contractorName: group.contractor.name,
          status: 'error',
          error: error.message
        })
      }
    }

    const successCount = results.filter(r => r.status === 'created').length
    const errorCount = results.filter(r => r.status === 'error').length
    const skipCount = results.filter(r => r.status === 'skipped').length

    console.log('✅ 月次請求書生成処理完了:', {
      billingPeriod: `${billingYear}-${billingMonth.toString().padStart(2, '0')}`,
      total: results.length,
      success: successCount,
      errors: errorCount,
      skipped: skipCount
    })

    return NextResponse.json({
      success: true,
      billingPeriod: `${billingYear}-${billingMonth.toString().padStart(2, '0')}`,
      summary: {
        total: results.length,
        created: successCount,
        errors: errorCount,
        skipped: skipCount
      },
      results
    })

  } catch (error: any) {
    console.error('❌ 月次請求書生成処理エラー:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error.message
    }, { status: 500 })
  }
}