import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ message: '本番では無効です' }, { status: 403 })
    }

    const supabaseAdmin = createSupabaseAdmin()
    const emails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean)

    const results: Array<{ email: string; status: string; message?: string }> = []

    for (const email of emails) {
      try {
        // usersテーブルでプロファイル取得
        const { data: userProfile, error: userErr } = await supabaseAdmin
          .from('users')
          .select('id, auth_user_id, email')
          .eq('email', email)
          .maybeSingle()

        if (!userProfile) {
          results.push({ email, status: 'skip', message: 'usersプロファイル未作成' })
          continue
        }

        // 既存の管理者membershipを確認
        const { data: existing } = await supabaseAdmin
          .from('memberships')
          .select('id, role')
          .eq('user_id', userProfile.id)
          .eq('role', 'Admin')
          .maybeSingle()

        if (!existing) {
          await supabaseAdmin
            .from('memberships')
            .insert({ user_id: userProfile.id, role: 'Admin' })
        }

        results.push({ email, status: 'ok' })
      } catch (e: any) {
        results.push({ email, status: 'error', message: e?.message || 'unknown' })
      }
    }

    return NextResponse.json({ message: 'Admin付与を実行しました', results }, { status: 200 })
  } catch (error) {
    console.error('grant-admin error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


