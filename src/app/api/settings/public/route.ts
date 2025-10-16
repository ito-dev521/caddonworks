import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 認証不要の公開設定（現在は support_fee_percent のみ）
export async function GET(_request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()
    const { data: settings } = await supabase
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()

    const support_fee_percent = Number(settings?.support_fee_percent ?? 8)
    return NextResponse.json({ support_fee_percent }, { status: 200 })
  } catch (error) {
    console.error('public settings error:', error)
    return NextResponse.json({ support_fee_percent: 8 }, { status: 200 })
  }
}




































