import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // 最小限のデータでテーブル構造をテスト
    const minimalData = {
      id: crypto.randomUUID(),
      project_id: '00000000-0000-0000-0000-000000000000',
      invoice_number: 'TEST-002',
      contractor_id: '00000000-0000-0000-0000-000000000000',
      org_id: '00000000-0000-0000-0000-000000000000',
      status: 'issued',
      created_at: new Date().toISOString()
    }


    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('invoices')
      .insert(minimalData)
      .select()

    // 挿入後すぐに削除
    if (insertResult && insertResult.length > 0) {
      await supabaseAdmin
        .from('invoices')
        .delete()
        .eq('id', minimalData.id)
    }

    return NextResponse.json({
      minimalData,
      insertResult,
      insertError,
      message: 'invoicesテーブル最小限テスト結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Invoices columns debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 200 }
    )
  }
}
