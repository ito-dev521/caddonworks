import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

// 受注者が自身の契約でサポート利用を有効化/無効化する
// POST /api/contracts/:id/support  { enable: boolean }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseAdmin()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!me) return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 403 })

    const contractId = params.id
    const { data: contract, error: cErr } = await supabase
      .from('contracts')
      .select('id, contractor_id, project_id')
      .eq('id', contractId)
      .single()
    if (cErr || !contract) return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })

    if (contract.contractor_id !== me.id) {
      return NextResponse.json({ message: 'この契約を操作する権限がありません' }, { status: 403 })
    }

    const body = await request.json()
    const enable = !!body?.enable

    const { error: uErr } = await supabase
      .from('contracts')
      .update({ support_enabled: enable })
      .eq('id', contractId)

    if (uErr) return NextResponse.json({ message: '更新に失敗しました' }, { status: 500 })

    return NextResponse.json({ success: true, support_enabled: enable }, { status: 200 })
  } catch (error) {
    console.error('contract support toggle error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}







