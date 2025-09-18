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

// 優先依頼作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, contractor_ids, expires_in_hours = 72 } = body

    if (!project_id || !contractor_ids || !Array.isArray(contractor_ids)) {
      return NextResponse.json({ message: 'プロジェクトIDと受注者IDリストが必要です' }, { status: 400 })
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

    // OrgAdminのメンバーシップを探す
    const membership = memberships.find(m => m.role === 'OrgAdmin')
    if (!membership) {
      return NextResponse.json({ message: 'この操作を実行する権限がありません' }, { status: 403 })
    }

    const company = membership.organizations as any

    // プロジェクトの存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, org_id, title')
      .eq('id', project_id)
      .eq('org_id', company.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    // お気に入り会員の確認
    const { data: favoriteMembers, error: favoriteError } = await supabaseAdmin
      .from('favorite_members')
      .select('contractor_id')
      .eq('org_id', company.id)
      .eq('is_active', true)
      .in('contractor_id', contractor_ids)

    if (favoriteError) {
      console.error('お気に入り会員確認エラー:', favoriteError)
      return NextResponse.json({ message: 'お気に入り会員の確認に失敗しました' }, { status: 500 })
    }

    const validContractorIds = favoriteMembers?.map(fm => fm.contractor_id) || []
    if (validContractorIds.length === 0) {
      return NextResponse.json({ message: '有効なお気に入り会員が見つかりません' }, { status: 400 })
    }

    // 期限を計算
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + expires_in_hours)

    // 優先依頼を作成
    const invitations = validContractorIds.map(contractorId => ({
      project_id: project_id,
      contractor_id: contractorId,
      org_id: company.id,
      expires_at: expiresAt.toISOString()
    }))

    const { data: newInvitations, error: insertError } = await supabaseAdmin
      .from('priority_invitations')
      .insert(invitations)
      .select()

    if (insertError) {
      console.error('優先依頼作成エラー:', insertError)
      return NextResponse.json({ message: '優先依頼の作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: `${validContractorIds.length}名のお気に入り会員に優先依頼を送信しました`,
      invitations: newInvitations
    }, { status: 201 })

  } catch (error) {
    console.error('優先依頼作成API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 優先依頼一覧取得（受注者向け）
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

    // 自分宛の優先依頼を取得
    const { data: invitations, error: invitationsError } = await supabaseAdmin
      .from('priority_invitations')
      .select(`
        id,
        project_id,
        invited_at,
        responded_at,
        response,
        response_notes,
        expires_at,
        projects (
          id,
          title,
          description,
          budget,
          start_date,
          end_date,
          category,
          bidding_deadline,
          requirements,
          location,
          organizations (
            id,
            name
          )
        )
      `)
      .eq('contractor_id', userProfile.id)
      .order('invited_at', { ascending: false })

    if (invitationsError) {
      console.error('優先依頼取得エラー:', invitationsError)
      return NextResponse.json({ message: '優先依頼の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      invitations: invitations || []
    }, { status: 200 })

  } catch (error) {
    console.error('優先依頼取得API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
