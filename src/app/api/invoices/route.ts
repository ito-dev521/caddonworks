import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { renderJapaneseInvoicePdf } from '@/lib/pdf'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Supabaseクライアントを作成
    const supabaseAdmin = createSupabaseAdmin()

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

    // ユーザーのロール（見つからない場合は受注者として扱う）
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .maybeSingle()

    // 権限チェック（OrgAdminのみ請求書作成可能）
    if (membership.role !== 'OrgAdmin' || project.org_id !== membership.org_id) {
      return NextResponse.json({ message: '請求書を作成する権限がありません' }, { status: 403 })
    }

    // 受注者情報は後で契約から判定（project.contractor_id が null の場合があるため）

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name, contact_person, address, phone, email')
      .eq('id', membership.org_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 404 })
    }

    // 契約データの存在確認（プロジェクトに紐づく最新の署名済み契約）
    const { data: contracts, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('id, status, bid_amount, contractor_id')
      .eq('project_id', project_id)
      .eq('status', 'signed')
      .order('created_at', { ascending: false })
      .limit(1)

    if (contractError) {
      console.error('契約検索エラー:', contractError)
      return NextResponse.json({ 
        message: '契約の検索に失敗しました',
        error: contractError.message
      }, { status: 500 })
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({ message: '署名済みの契約が見つかりません' }, { status: 404 })
    }

    const contract = contracts[0] // 最新の契約を使用

    // 契約の受注者を取得
    const { data: contractor, error: contractorError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('id', contract.contractor_id)
      .single()

    if (contractorError || !contractor) {
      return NextResponse.json({ message: '受注者情報が見つかりません' }, { status: 404 })
    }

    // 既存の請求書の存在確認
    const { data: existingInvoices, error: existingError } = await supabaseAdmin
      .from('invoices')
      .select('id, status')
      .eq('contract_id', contract.id)

    if (existingError) {
      console.error('既存請求書確認エラー:', existingError)
      return NextResponse.json({ message: '既存請求書の確認に失敗しました' }, { status: 500 })
    }

    if (existingInvoices && existingInvoices.length > 0) {
      // 既存の請求書がある場合は、最新のものを返す
      const latestInvoice = existingInvoices[0]
      return NextResponse.json({
        message: '業務完了届は既に作成済みです',
        invoice: latestInvoice,
        pdf_url: `/api/invoices?id=${latestInvoice.id}`,
        alreadyExists: true
      }, { status: 200 })
    }

    // 請求書番号を生成
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // 請求書データを作成（実際のテーブル構造に合わせて）
    const contractAmount = contract.bid_amount || project.budget || 0
    const systemFee = 50000 // システム手数料（発注者側の手数料）
    
    // 業務完了届（受注者向け）の場合は契約金額のみ、その他はシステム手数料込み
    const totalAmount = type === 'completion' ? contractAmount : contractAmount + systemFee
    
    const invoiceData = {
      project_id: project_id,
      client_org_id: project.org_id,
      base_amount: contractAmount,
      fee_amount: 0, // 追加手数料（今回は0）
      system_fee: type === 'completion' ? 0 : systemFee, // 業務完了届の場合はシステム手数料を0に
      total_amount: totalAmount,
      status: type === 'completion' ? 'issued' : 'draft', // 業務完了届の場合は発行済み、その他は下書き
      issue_date: type === 'completion' ? new Date().toISOString().split('T')[0] : null, // 業務完了届の場合は発行日を設定
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日後
      org_id: project.org_id,
      contractor_id: contract.contractor_id,
      contract_id: contract.id
    }

    // 請求書をデータベースに保存
    const { data: insertedInvoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single()

    if (invoiceError) {
      console.error('請求書作成エラー:', invoiceError)
      return NextResponse.json({ 
        message: '請求書の作成に失敗しました', 
        error: invoiceError.message,
        details: invoiceError 
      }, { status: 500 })
    }

    // 通知を作成（受注者向け）
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: contract.contractor_id,
        title: '業務完了届が作成されました',
        message: `案件「${project.title}」の業務完了届が作成されました。請求書ページで確認できます。`,
        type: 'completion_report_created',
        data: {
          project_id: project_id,
          invoice_id: insertedInvoice.id
        }
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
    }

    return NextResponse.json({
      message: '請求書が正常に作成されました。受注者に通知が送信されます。',
      invoice: insertedInvoice,
      pdf_url: `/api/invoices?id=${insertedInvoice.id}`
    }, { status: 201 })

  } catch (error) {
    console.error('請求書作成エラー:', error)
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
    const supabaseAdmin = createSupabaseAdmin()

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

    // PDF単体取得か判定
    const { searchParams } = new URL(request.url)
    const invoiceId = searchParams.get('id')

    if (invoiceId) {
      const { data: invoice, error } = await supabaseAdmin
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .single()

      if (error || !invoice) {
        return NextResponse.json({ message: '請求書が見つかりません' }, { status: 404 })
      }

      // 付随情報の取得（発注者/受注者、プロジェクト）
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id, title, start_date, end_date, assignee_name, org_id, contractor_id')
        .eq('id', invoice.project_id)
        .single()

      const { data: org } = await supabaseAdmin
        .from('organizations')
        .select('name, address, invoice_registration_number')
        .eq('id', project?.org_id)
        .single()

      const { data: contractor } = await supabaseAdmin
        .from('users')
        .select('display_name, address')
        .eq('id', project?.contractor_id)
        .single()

      const taxRate = 0.1
      const amountExcl = invoice.amount || 0
      const tax = Math.round(amountExcl * taxRate)
      const total = amountExcl + tax
      // 源泉: 100万未満 → 総額*0.1021, 100万以上 → (総額-1000000)*0.2042 + 102100
      const withholding = total < 1000000
        ? Math.floor(total * 0.1021)
        : Math.floor((total - 1000000) * 0.2042 + 102100)

      const pdfBuf = await renderJapaneseInvoicePdf({
        issuer: {
          name: org?.name || '',
          address: org?.address || '',
          invoiceRegNo: org?.invoice_registration_number || null
        },
        contractor: {
          name: contractor?.display_name || '',
          address: contractor?.address || ''
        },
        orderNo: invoice.contract_id ?? '—',
        assignee: project?.assignee_name ?? null,
        title: project?.title || '',
        period: { from: project?.start_date, to: project?.end_date },
        amountExcl,
        taxRate,
        dueDate: invoice.due_date,
        payMethod: '口座振込',
        note: '※支払金額は振込手数料等、源泉徴収を控除した金額とする',
        withHolding: withholding
      })

      return new NextResponse(pdfBuf, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="invoice_${invoice.id}.pdf"`
        }
      })
    }

    // 請求書一覧を取得
    let query = supabaseAdmin.from('invoices').select('*')

    if (membership?.role === 'OrgAdmin') {
      query = query.eq('org_id', membership.org_id)
    } else {
      // 受注者: users.id でも auth.user.id でもマッチするよう OR フィルタ
      query = query.or(`contractor_id.eq.${userProfile.id},contractor_id.eq.${user.id}`)
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