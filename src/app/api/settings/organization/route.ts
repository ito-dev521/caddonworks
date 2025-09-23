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

// 組織設定を取得
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

    const orgMembership = userMemberships.find(m => m.role === 'OrgAdmin' || m.role === 'Staff')
    if (!orgMembership) {
      return NextResponse.json({ message: 'OrgAdminまたはStaff権限がありません' }, { status: 403 })
    }

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgMembership.org_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ 
      organization: {
        id: organization.id,
        name: organization.name,
        billing_email: organization.billing_email,
        system_fee: organization.system_fee,
        active: organization.active,
        approval_required: organization.approval_required || false,
        created_at: organization.created_at
      }
    }, { status: 200 })

  } catch (error) {
    console.error('組織設定取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

// 組織設定を更新
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { approval_required } = body

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

    const orgMembership = userMemberships.find(m => m.role === 'OrgAdmin')
    if (!orgMembership) {
      return NextResponse.json({ message: 'OrgAdmin権限がありません' }, { status: 403 })
    }

    // 組織設定を更新
    const { data: updatedOrganization, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ approval_required })
      .eq('id', orgMembership.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('組織設定更新エラー:', updateError)
      return NextResponse.json({ message: '組織設定の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '組織設定が更新されました',
      organization: {
        id: updatedOrganization.id,
        name: updatedOrganization.name,
        approval_required: updatedOrganization.approval_required
      }
    }, { status: 200 })

  } catch (error) {
    console.error('組織設定更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
