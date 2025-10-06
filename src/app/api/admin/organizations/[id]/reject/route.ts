import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id
    const { reason } = await request.json()

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { message: '却下理由が必要です' },
        { status: 400 }
      )
    }

    // 組織を却下状態に更新
    const { error } = await supabaseAdmin
      .from('organizations')
      .update({
        approval_status: 'rejected',
        rejection_reason: reason.trim(),
        active: false // 却下時は非アクティブ化
      })
      .eq('id', organizationId)

    if (error) {
      console.error('Organization rejection error:', error)
      return NextResponse.json(
        { message: '組織の却下に失敗しました', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: '組織を却下しました'
    }, { status: 200 })

  } catch (error) {
    console.error('組織却下APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}