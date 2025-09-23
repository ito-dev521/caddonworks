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

// お気に入り会員一覧取得
export async function GET(request: NextRequest) {
  try {
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

    // OrgAdminまたはStaffのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin' || m.role === 'Staff')
    if (!membership) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません' }, { status: 403 })
    }

    const company = membership.organizations as any

    // お気に入り会員一覧を取得
    const { data: favoriteMembers, error: favoriteError } = await supabaseAdmin
      .from('favorite_members')
      .select(`
        id,
        contractor_id,
        added_at,
        notes,
        is_active,
        users!favorite_members_contractor_id_fkey (
          id,
          display_name,
          email,
          specialties,
          experience_years,
          rating
        )
      `)
      .eq('org_id', company.id)
      .eq('is_active', true)
      .order('added_at', { ascending: false })

    if (favoriteError) {
      console.error('お気に入り会員取得エラー:', favoriteError)
      return NextResponse.json({ message: 'お気に入り会員の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      favorite_members: favoriteMembers || []
    }, { status: 200 })

  } catch (error) {
    console.error('お気に入り会員API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// お気に入り会員追加
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractor_id, notes } = body

    if (!contractor_id) {
      return NextResponse.json({ message: '受注者IDが必要です' }, { status: 400 })
    }

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

    // OrgAdminまたはStaffのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin' || m.role === 'Staff')
    if (!membership) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません' }, { status: 403 })
    }

    const company = membership.organizations as any

    // 既にお気に入り登録されているかチェック
    const { data: existingFavorite, error: checkError } = await supabaseAdmin
      .from('favorite_members')
      .select('id')
      .eq('org_id', company.id)
      .eq('contractor_id', contractor_id)
      .eq('is_active', true)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116は「データが見つからない」エラー
      console.error('お気に入り会員チェックエラー:', checkError)
      return NextResponse.json({ message: 'お気に入り会員の確認に失敗しました' }, { status: 500 })
    }

    if (existingFavorite) {
      return NextResponse.json({ message: '既にお気に入り会員に登録されています' }, { status: 400 })
    }

    // お気に入り会員を追加
    const { data: newFavorite, error: insertError } = await supabaseAdmin
      .from('favorite_members')
      .insert({
        org_id: company.id,
        contractor_id: contractor_id,
        added_by: userProfile.id,
        notes: notes || null
      })
      .select()
      .single()

    if (insertError) {
      console.error('お気に入り会員追加エラー:', insertError)
      return NextResponse.json({ message: 'お気に入り会員の追加に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: 'お気に入り会員に追加されました',
      favorite_member: newFavorite
    }, { status: 201 })

  } catch (error) {
    console.error('お気に入り会員追加API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
