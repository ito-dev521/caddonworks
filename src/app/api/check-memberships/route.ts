import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // admin@demo.comユーザーのmembershipを取得
    const { data: adminMemberships, error: adminError } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        users!inner(email, display_name),
        organizations(name)
      `)
      .eq('users.email', 'admin@demo.com')

    // orgadmin@demo.comユーザーのmembershipを取得
    const { data: orgAdminMemberships, error: orgAdminError } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        users!inner(email, display_name),
        organizations(name)
      `)
      .eq('users.email', 'orgadmin@demo.com')

    return NextResponse.json({
      message: 'membership情報確認',
      adminMemberships: adminMemberships,
      adminError: adminError,
      orgAdminMemberships: orgAdminMemberships,
      orgAdminError: orgAdminError
    }, { status: 200 })

  } catch (error) {
    console.error('check-memberships API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}













