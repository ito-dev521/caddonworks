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
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }


    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('ユーザープロフィール取得エラー:', userError)
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }


    // ユーザーの組織情報を取得
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select(`
        *,
        organizations(*)
      `)
      .eq('user_id', userProfile.id)
      .eq('role', 'OrgAdmin')

    if (membershipError || !memberships || memberships.length === 0) {
      console.error('membership取得エラー:', membershipError)
      return NextResponse.json(
        { message: '組織情報が見つかりません: ' + (membershipError?.message || '不明なエラー') },
        { status: 404 }
      )
    }

    const membership = memberships[0]

    const org: any = membership.organizations
    const organization = {
      id: org.id,
      name: org.name || '',
      postal_code: org.postal_code || '',
      address: org.address || '',
      phone_number: org.phone || '',
      representative_name: org.contact_person || '',
      department: org.department || '',
      position: org.position || '',
      website: org.website || '',
      business_registration_number: org.registration_number || '',
      business_type: org.business_type || '',
      updated_at: org.updated_at || new Date().toISOString()
    }

    return NextResponse.json({
      user: userProfile,
      organization,
      membership: membership
    }, { status: 200 })

  } catch (error) {
    console.error('organization profile API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      console.error('ユーザープロフィール取得エラー:', userError)
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const incoming = body?.organizationData ?? body ?? {}

    // ユーザーの所属組織（OrgAdmin）を取得して安全に更新ターゲットを特定
    const { data: userMemberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !userMemberships || userMemberships.length === 0) {
      return NextResponse.json({ message: 'メンバーシップが見つかりません' }, { status: 403 })
    }

    const orgMembership = userMemberships.find(m => m.role === 'OrgAdmin')
    if (!orgMembership?.org_id) {
      return NextResponse.json({ message: 'OrgAdmin権限がありません' }, { status: 403 })
    }

    // 受け取ったフィールドをDBカラムにマッピング（存在しないカラムは無視）
    const updateData: any = { updated_at: new Date().toISOString() }
    if (incoming.name !== undefined) updateData.name = incoming.name
    if (incoming.address !== undefined) updateData.address = incoming.address
    if (incoming.phone_number !== undefined) updateData.phone = incoming.phone_number
    if (incoming.phone !== undefined) updateData.phone = incoming.phone
    // 追加フィールド（存在する環境では反映される）
    if (incoming.postal_code !== undefined) updateData.postal_code = incoming.postal_code
    if (incoming.department !== undefined) updateData.department = incoming.department
    if (incoming.position !== undefined) updateData.position = incoming.position
    if (incoming.website !== undefined) updateData.website = incoming.website
    if (incoming.business_type !== undefined) updateData.business_type = incoming.business_type
    if (incoming.business_registration_number !== undefined) updateData.registration_number = incoming.business_registration_number
    if (incoming.registration_number !== undefined) updateData.registration_number = incoming.registration_number
    if (incoming.representative_name !== undefined) updateData.contact_person = incoming.representative_name
    if (incoming.contact_person !== undefined) updateData.contact_person = incoming.contact_person
    // postal_code, department, position は現状のスキーマに存在しないため無視

    // 組織情報を更新
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', orgMembership.org_id)
      .select()
      .single()

    if (updateError) {
      console.error('組織情報更新エラー:', updateError)
      return NextResponse.json(
        { message: '組織情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    const organization = {
      id: updatedOrg.id,
      name: updatedOrg.name || '',
      postal_code: updatedOrg.postal_code || '',
      address: updatedOrg.address || '',
      phone_number: updatedOrg.phone || '',
      representative_name: updatedOrg.contact_person || '',
      department: updatedOrg.department || '',
      position: updatedOrg.position || '',
      website: updatedOrg.website || '',
      business_registration_number: updatedOrg.registration_number || '',
      business_type: updatedOrg.business_type || '',
      updated_at: updatedOrg.updated_at || new Date().toISOString()
    }

    return NextResponse.json({
      message: '組織情報が正常に更新されました',
      organization
    }, { status: 200 })

  } catch (error) {
    console.error('organization profile update API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
