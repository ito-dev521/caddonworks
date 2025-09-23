import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id

    // 組織を未承認状態にリセット
    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        approval_status: 'pending',
        approved_at: null,
        active: false,
        box_folder_id: null,
        rejection_reason: null
      })
      .eq('id', organizationId)

    if (error) {
      console.error('Organization reset error:', error)
      return NextResponse.json(
        { message: '組織のリセットに失敗しました', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '組織を未承認状態にリセットしました'
    }, { status: 200 })

  } catch (error) {
    console.error('組織リセットAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}