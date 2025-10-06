import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

// お気に入り会員削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: favoriteId } = params

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // ユーザーの組織情報を取得
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        org_id,
        role,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません' }, { status: 403 })
    }

    const company = membership.organizations as any

    // お気に入り会員の存在確認と権限チェック
    const { data: favoriteMember, error: checkError } = await supabaseAdmin
      .from('favorite_members')
      .select('id, org_id')
      .eq('id', favoriteId)
      .eq('org_id', company.id)
      .single()

    if (checkError || !favoriteMember) {
      return NextResponse.json({ message: 'お気に入り会員が見つかりません' }, { status: 404 })
    }

    // お気に入り会員を削除（論理削除）
    const { error: deleteError } = await supabaseAdmin
      .from('favorite_members')
      .update({ is_active: false })
      .eq('id', favoriteId)

    if (deleteError) {
      console.error('お気に入り会員削除エラー:', deleteError)
      return NextResponse.json({ message: 'お気に入り会員の削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'お気に入り会員から削除されました'
    }, { status: 200 })

  } catch (error) {
    console.error('お気に入り会員削除API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
