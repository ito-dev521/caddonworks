import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    const auth = request.headers.get('authorization')
    if (!auth) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = auth.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証失敗' }, { status: 401 })

    // Adminメール or membershipsでAdminを許可
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',').map(e=>e.trim().toLowerCase())
    let isAdmin = user.email ? adminEmails.includes(user.email.toLowerCase()) : false
    if (!isAdmin) {
      const { data: profile } = await supabase.from('users').select('id').eq('auth_user_id', user.id).maybeSingle()
      if (profile) {
        const { data: mem } = await supabase.from('memberships').select('role').eq('user_id', profile.id).eq('role','Admin').maybeSingle()
        if (mem) isAdmin = true
      }
    }
  if (!isAdmin) return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')?.toLowerCase() || ''
    const status = searchParams.get('status')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase.from('invoices').select(`
      id, status, issue_date, due_date, total_amount,
      projects:project_id ( id, title ),
      organizations:org_id ( id, name )
    `)

    if (status) query = query.eq('status', status)
    if (from) query = query.gte('issue_date', from)
    if (to) query = query.lte('issue_date', to)

    const { data, error } = await query.order('issue_date', { ascending: false })
    if (error) return NextResponse.json({ message: '取得失敗', error }, { status: 500 })

    const rows = (data || []).map((d: any) => ({
      id: d.id,
      invoice_number: d.invoice_number || `INV-${String(d.id).slice(0,8).toUpperCase()}`,
      status: d.status,
      issue_date: d.issue_date,
      due_date: d.due_date,
      total_amount: d.total_amount ?? 0,
      project: { id: d.projects?.id, title: d.projects?.title },
      client_org: { id: d.organizations?.id, name: d.organizations?.name }
    }))

    const filtered = q
      ? rows.filter(r =>
          r.invoice_number.toLowerCase().includes(q) ||
          (r.project?.title || '').toLowerCase().includes(q) ||
          (r.client_org?.name || '').toLowerCase().includes(q)
        )
      : rows

    return NextResponse.json({ invoices: filtered }, { status: 200 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}


