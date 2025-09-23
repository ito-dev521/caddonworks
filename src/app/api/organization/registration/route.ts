import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    // ログインユーザーのプロフィール
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 404 })
    }

    // 組織所属（OrgAdmin）の組織を取得
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', profile.id)
      .eq('role', 'OrgAdmin')
      .limit(1)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織登録申請は見つかりません' }, { status: 404 })
    }

    const orgId = membership.org_id

    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    // モデルをフロントの表示形式へ合わせて変換
    const registration = {
      id: org.id,
      organization_name: org.name,
      organization_type: org.business_type || 'organization',
      tax_id: org.registration_number || org.tax_id || null,
      address: org.address || '',
      phone: org.phone || '',
      billing_email: org.billing_email || org.email || '',
      website: org.website || null,
      description: org.description || null,
      admin_name: profile.display_name,
      admin_email: profile.email,
      admin_phone: '',
      admin_department: null,
      system_fee: org.system_fee ?? 50000,
      status: (org.approval_status || 'pending') as 'pending' | 'approved' | 'rejected',
      submitted_at: org.created_at,
      reviewed_at: org.approved_at || null,
      reviewer_notes: org.rejection_reason || null
    }

    return NextResponse.json({ registration }, { status: 200 })
  } catch (error) {
    console.error('organization/registration GET error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


