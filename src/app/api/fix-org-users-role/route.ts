import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
)

// 指定の組織に属するユーザーで、誤って Contractor になっている人を Staff に修正
// Body: { orgId: string }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const orgId = body?.orgId as string | undefined
    if (!orgId) {
      return NextResponse.json({ message: 'orgId は必須です' }, { status: 400 })
    }

    // 対象組織のメンバー一覧を取得
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('user_id, role')
      .eq('org_id', orgId)

    if (membershipError) {
      console.error('メンバーシップ取得エラー:', membershipError)
      return NextResponse.json({ message: 'メンバー一覧の取得に失敗しました' }, { status: 500 })
    }

    const targetUserIds = (memberships || [])
      .filter(m => m.role === 'Contractor')
      .map(m => m.user_id)

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: '修正対象はありません' }, { status: 200 })
    }

    // Contractor を Staff に更新
    const { error: updateError } = await supabaseAdmin
      .from('memberships')
      .update({ role: 'Staff' })
      .eq('org_id', orgId)
      .in('user_id', targetUserIds)

    if (updateError) {
      console.error('ロール更新エラー:', updateError)
      return NextResponse.json({ message: 'ロール更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '対象ユーザーのロールを Staff に修正しました',
      updatedCount: targetUserIds.length
    }, { status: 200 })
  } catch (error) {
    console.error('fix-org-users-role API: エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


