import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function toRegistration(o: any, admin: any | null) {
  return {
    id: o.id,
    organization_name: o.name,
    organization_type: o.business_type || 'organization',
    tax_id: o.registration_number || o.tax_id || null,
    address: o.address || '',
    phone: o.phone || '',
    billing_email: o.billing_email || o.email || '',
    website: o.website || null,
    description: o.description || null,
    admin_name: admin?.formal_name || admin?.display_name || '',
    admin_email: admin?.email || '',
    admin_phone: admin?.phone_number || '',
    admin_department: admin?.department || null,
    system_fee: o.system_fee ?? 50000,
    status: (o.approval_status || 'pending') as 'pending' | 'approved' | 'rejected',
    submitted_at: o.created_at,
    reviewed_at: o.approved_at || null,
    reviewer_notes: o.rejection_reason || null
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    // Adminチェック
    const { data: profile, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !profile || profile.role !== 'Admin') {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 組織一覧（受注者を除外）
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .neq('name', '個人事業主（受注者）')
      .order('created_at', { ascending: false })

    if (orgsError) {
      return NextResponse.json({ message: '組織一覧の取得に失敗しました', error: orgsError.message }, { status: 500 })
    }

    // OrgAdminの連絡先を付与
    const registrations = await Promise.all((orgs || []).map(async (o) => {
      const { data: adminMembership, error: adminError } = await supabaseAdmin
        .from('memberships')
        .select(`users!inner(id, display_name, email, formal_name, phone_number, department)`) 
        .eq('org_id', o.id)
        .eq('role', 'OrgAdmin')
        .limit(1)
        .single()
      const admin = adminError ? null : (adminMembership as any)?.users
      return toRegistration(o, admin)
    }))

    return NextResponse.json({ registrations }, { status: 200 })
  } catch (error) {
    console.error('organization-registrations GET error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    const { registration_id, action, reviewer_notes } = await request.json()
    if (!registration_id || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: '無効なリクエストです' }, { status: 400 })
    }

    // 既存の承認APIに委譲
    const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const res = await fetch(`${base}/api/admin/organizations/${registration_id}/approval`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, reason: reviewer_notes || null })
    })

    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ message: json.message || '処理に失敗しました' }, { status: res.status })
    }

    return NextResponse.json(json, { status: 200 })
  } catch (error) {
    console.error('organization-registrations PUT error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}


