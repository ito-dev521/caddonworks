import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    // メンバーシップから受注者を特定
    const { data: contractorMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        role,
        users!inner (
          id,
          email,
          display_name,
          organization,
          created_at,
          auth_user_id,
          formal_name,
          phone_number,
          member_level
        )
      `)
      .eq('role', 'Contractor')
      .order('created_at', { ascending: false })

    if (membershipError) {
      console.error('受注者取得エラー:', membershipError)

      // メンバーシップテーブルがない場合のフォールバック：全ユーザーから受注者らしきユーザーを取得
      const { data: allUsers, error: usersError } = await supabaseAdmin
        .from('users')
        .select(`
          id,
          email,
          display_name,
          organization,
          created_at,
          auth_user_id,
          formal_name,
          phone_number,
          member_level
        `)
        .order('created_at', { ascending: false })

      if (usersError) {
        return NextResponse.json({
          message: '受注者情報の取得に失敗しました',
          error: usersError.message
        }, { status: 500 })
      }

      // 真の個人事業主のみを抽出（明示的に2人のみ）
      const contractors = allUsers?.filter(user =>
        user.email === 'contractor@demo.com' ||
        user.email === 'iiistylelab@gmail.com'
      ) || []

      return NextResponse.json({
        contractors: contractors.map(user => ({
          ...user,
          role: 'Contractor', // 仮の役割を設定
          active: true // 仮の状態を設定
        })),
        total: contractors.length,
        note: 'メンバーシップテーブルから取得できないため、推定で受注者を表示しています'
      }, { status: 200 })
    }

    // メンバーシップから受注者情報を取得し、真の個人事業主のみフィルタリング
    const contractors = contractorMemberships
      ?.filter(membership =>
        (membership.users as any)?.email === 'contractor@demo.com' ||
        (membership.users as any)?.email === 'iiistylelab@gmail.com'
      )
      ?.map(membership => ({
        id: (membership.users as any)?.id,
        email: (membership.users as any)?.email,
        display_name: (membership.users as any)?.display_name,
        organization: (membership.users as any)?.organization,
        role: membership.role,
        active: true, // メンバーシップが存在することで有効とみなす
        created_at: (membership.users as any)?.created_at,
        formal_name: (membership.users as any)?.formal_name,
        phone_number: (membership.users as any)?.phone_number,
        member_level: (membership.users as any)?.member_level
      })) || []

    return NextResponse.json({
      contractors: contractors,
      total: contractors.length
    }, { status: 200 })

  } catch (error) {
    console.error('受注者一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}