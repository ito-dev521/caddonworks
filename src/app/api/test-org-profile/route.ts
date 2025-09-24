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

    // orgadmin@demo.comのユーザー情報を取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'orgadmin@demo.com')
      .single()

    if (userError || !userProfile) {
      console.error('ユーザー取得エラー:', userError)
      return NextResponse.json(
        { message: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }


    // ユーザーのmembershipを取得
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        organizations(*)
      `)
      .eq('user_id', userProfile.id)
      .eq('role', 'OrgAdmin')

    if (membershipError) {
      console.error('membership取得エラー:', membershipError)
      return NextResponse.json(
        { message: 'membership取得エラー: ' + membershipError.message },
        { status: 500 }
      )
    }


    return NextResponse.json({
      message: 'テスト成功',
      user: userProfile,
      memberships: membership
    }, { status: 200 })

  } catch (error) {
    console.error('test-org-profile API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}



















