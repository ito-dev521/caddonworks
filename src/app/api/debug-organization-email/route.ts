import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // 認証ヘッダーからユーザー情報を取得
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
      .select('id, email')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // メンバーシップから組織情報を取得
    const { data: userMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !userMemberships || userMemberships.length === 0) {
      return NextResponse.json({ message: 'メンバーシップが見つかりません' }, { status: 403 })
    }

    const orgId = userMemberships.find(m => m.role === 'OrgAdmin')?.org_id

    if (!orgId) {
      return NextResponse.json({ message: 'OrgAdmin権限が見つかりません' }, { status: 403 })
    }

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    // 組織のメンバーシップ一覧を取得
    const { data: orgMemberships, error: membershipsError } = await supabaseAdmin
      .from('memberships')
      .select(`
        user_id,
        role,
        created_at
      `)
      .eq('org_id', orgId)

    // 組織のユーザー一覧を取得
    const userIds = orgMemberships?.map(m => m.user_id) || []
    const { data: orgUsers } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name, formal_name')
      .in('id', userIds)

    // 結果を整形
    const result = {
      organization: {
        id: organization.id,
        name: organization.name,
        billing_email: organization.billing_email,
        system_fee: organization.system_fee,
        active: organization.active,
        created_at: organization.created_at
      },
      members: orgUsers?.map(user => {
        const membership = orgMemberships?.find(m => m.user_id === user.id)
        return {
          user_id: user.id,
          email: user.email,
          display_name: user.display_name,
          formal_name: user.formal_name,
          role: membership?.role,
          created_at: membership?.created_at
        }
      }) || [],
      current_user: {
        user_id: userProfile.id,
        email: userProfile.email,
        role: userMemberships.find(m => m.role === 'OrgAdmin')?.role
      }
    }

    return NextResponse.json({ 
      message: '組織情報とメールアドレス調査結果',
      data: result
    }, { status: 200 })

  } catch (error) {
    console.error('組織メール調査APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
