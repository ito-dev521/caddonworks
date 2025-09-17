import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 最小限の必須フィールドのみでテスト
    const minimalInvoiceData = {
      id: crypto.randomUUID(),
      project_id: '2de6c4d4-83f4-4594-a53a-be14cb09108f', // 実際のプロジェクトID
      invoice_number: 'TEST-003',
      contractor_id: 'fcf21fbd-60bf-4f3f-aede-d9d540704cd9', // 実際の受注者ID
      org_id: 'f0ee631b-8c3f-407f-abd0-385a5212ca20', // 実際の組織ID
      base_amount: 5000, // 必須フィールド
      status: 'issued'
    }

    console.log('最小限請求書データ:', minimalInvoiceData)

    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('invoices')
      .insert(minimalInvoiceData)
      .select()

    // 挿入後すぐに削除
    if (insertResult && insertResult.length > 0) {
      await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('id', minimalInvoiceData.id)
    }

    return NextResponse.json({
      minimalInvoiceData,
      insertResult,
      insertError,
      message: '最小限請求書データテスト結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Minimal invoice debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    )
  }
}
