import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Supabaseクライアントを作成
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
    const { project_id, type } = body

    if (!project_id || !type) {
      return NextResponse.json({ message: 'プロジェクトIDとタイプが必要です' }, { status: 400 })
    }

    // プロジェクトを取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック（OrgAdminのみ請求書作成可能）
    if (membership.role !== 'OrgAdmin' || project.org_id !== membership.org_id) {
      return NextResponse.json({ message: '請求書を作成する権限がありません' }, { status: 403 })
    }

    // 受注者情報を取得
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('id', project.contractor_id)
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json({ message: '受注者情報が見つかりません' }, { status: 404 })
    }

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, contact_person, address, phone, email')
      .eq('id', membership.org_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    // 請求書番号を生成
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // 請求書データを作成
    const invoiceData = {
      id: crypto.randomUUID(),
      project_id: project_id,
      invoice_number: invoiceNumber,
      contractor_id: project.contractor_id,
      org_id: project.org_id,
      amount: project.budget,
      tax_rate: 0.1, // 10%
      tax_amount: Math.floor(project.budget * 0.1),
      total_amount: Math.floor(project.budget * 1.1),
      issue_date: new Date().toISOString(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30日後
      status: 'issued',
      description: `案件「${project.title}」の完了に伴う請求書`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // 請求書詳細情報
      billing_details: {
        project_title: project.title,
        project_description: project.description,
        contract_period: `${project.start_date} - ${project.end_date}`,
        contractor_name: contractor.display_name,
        contractor_email: contractor.email,
        organization_name: organization.name,
        organization_contact: organization.contact_person,
        organization_address: organization.address,
        organization_phone: organization.phone,
        organization_email: organization.email
      }
    }

    // 請求書をデータベースに保存
    const { error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)

    if (invoiceError) {
      console.error('請求書作成エラー:', invoiceError)
      return NextResponse.json({ message: '請求書の作成に失敗しました' }, { status: 500 })
    }

    // 通知を作成（受注者向け）
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: project.contractor_id,
        title: '請求書が発行されました',
        message: `案件「${project.title}」の請求書（${invoiceNumber}）が発行されました。`,
        type: 'invoice',
        related_id: project_id,
        created_at: new Date().toISOString()
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
    }

    return NextResponse.json({
      message: '請求書が正常に作成されました',
      invoice: invoiceData
    }, { status: 201 })

  } catch (error) {
    console.error('請求書作成APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Supabaseクライアントを作成
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 請求書一覧を取得
    let query = supabaseAdmin.from('invoices').select('*')

    if (membership.role === 'OrgAdmin') {
      // 発注者: 自分の組織の請求書
      query = query.eq('org_id', membership.org_id)
    } else if (membership.role === 'Contractor') {
      // 受注者: 自分宛の請求書
      query = query.eq('contractor_id', userProfile.id)
    } else {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    const { data: invoices, error: invoicesError } = await query.order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('請求書取得エラー:', invoicesError)
      return NextResponse.json({ message: '請求書の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      invoices: invoices || []
    }, { status: 200 })

  } catch (error) {
    console.error('請求書取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}