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
    const { project_id, type, contract_id } = body

    if ((!project_id && !contract_id) || !type) {
      return NextResponse.json({ message: 'プロジェクトIDまたは契約ID、タイプが必要です' }, { status: 400 })
    }

    // プロジェクトを取得（contract_id 指定時はそこから解決）
    let effectiveProjectId: string = project_id
    let contractFromParam: any = null
    if (!effectiveProjectId && contract_id) {
      const { data: c, error: cErr } = await supabaseAdmin
        .from('contracts')
        .select('id, project_id, status, bid_amount, contractor_id')
        .eq('id', contract_id)
        .single()
      if (cErr || !c) {
        // 短縮表示の契約ID（先頭8桁など）が渡された可能性に対応
        if (contract_id && contract_id.length < 36) {
          const { data: candidates, error: likeErr } = await supabaseAdmin
            .from('contracts')
            .select('id, project_id, status, bid_amount, contractor_id')
            .filter('id', 'ilike', `${contract_id}%`)
            .limit(1)
          if (!likeErr && candidates && candidates.length > 0) {
            contractFromParam = candidates[0]
            effectiveProjectId = candidates[0].project_id
          } else {
            return NextResponse.json({ message: '契約が見つかりません（表示用短縮IDの可能性）' }, { status: 404 })
          }
        } else {
          return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
        }
      } else {
        contractFromParam = c
        effectiveProjectId = c.project_id
      }
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', effectiveProjectId)
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

    // 契約データの存在確認
    let contract: any = null
    if (contractFromParam) {
      contract = contractFromParam
    } else {
      const { data: contracts, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, status, bid_amount, contractor_id, updated_at, created_at')
        .eq('project_id', effectiveProjectId)
        .in('status', ['signed', 'completed'])
        .order('updated_at', { ascending: false })
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
      contract = contracts[0]
    }

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

    // 表示用の請求書番号（列が存在しない環境もあるため保存は必須としない）
    const invoiceNumber = `INV-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

    // システム設定（サポート手数料％）を取得
    const { data: sysSettings } = await supabaseAdmin
      .from('system_settings')
      .select('support_fee_percent')
      .eq('id', 'global')
      .maybeSingle()
    const supportPercent = Number(sysSettings?.support_fee_percent ?? 8)

    // 契約・プロジェクトのサポートフラグ
    const projectSupport = !!project.support_enabled
    let contractSupport = false
    try {
      const { data: contractSupportRow } = await supabaseAdmin
        .from('contracts')
        .select('support_enabled')
        .eq('id', contract.id)
        .maybeSingle()
      contractSupport = !!contractSupportRow?.support_enabled
    } catch (_) {
      contractSupport = false
    }

    // 請求書データを作成（サポート％適用）
    const contractAmount = contract.bid_amount || project.budget || 0
    const supportFee = Math.round((contractAmount * supportPercent) / 100)
    
    // 仕様:
    // - 発注者がサポート利用: 発注者へサポート手数料を請求（受注者金額は減らさない）
    // - 受注者がサポート利用: 受注者への支払いからサポート手数料を控除
    // 現在のAPIは completion = 受注者→運営 方向の完了届（to_operator）
    // よって completion の場合は、受注者が利用時のみ控除（base_amount を減額）
    const isCompletion = type === 'completion'
    const applyContractorDeduct = isCompletion && contractSupport
    const baseAmount = applyContractorDeduct ? Math.max(0, contractAmount - supportFee) : contractAmount
    const systemFee = (!isCompletion && projectSupport) ? supportFee : 0
    const totalAmount = baseAmount + systemFee
    
    const invoiceData: any = {
      project_id: effectiveProjectId,
      client_org_id: project.org_id,
      base_amount: baseAmount,
      fee_amount: 0,
      system_fee: systemFee,
      total_amount: totalAmount,
      status: type === 'completion' ? 'issued' : 'draft', // 業務完了届の場合は発行済み、その他は下書き
      issue_date: type === 'completion' ? new Date().toISOString().split('T')[0] : null, // 業務完了届の場合は発行日を設定
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30日後
      org_id: project.org_id,
      contractor_id: contract.contractor_id,
      contract_id: contract.id,
      memo: contractSupport ? `受注者サポート控除 ${supportPercent}%` : (projectSupport ? `発注者サポート手数料 ${supportPercent}%` : null)
    }

    // 一部環境で存在しない列のため、存在する場合のみ付与（冪等）
    try {
      const { error: probeError } = await supabaseAdmin
        .from('invoices')
        .select('invoice_number')
        .limit(1)
      if (!probeError) {
        invoiceData.invoice_number = invoiceNumber
      }
    } catch (_) {
      // 列が無い環境。保存はスキップ
    }

    // 旧スキーマ（subtotal）互換
    try {
      const { error: subProbe } = await supabaseAdmin
        .from('invoices')
        .select('subtotal')
        .limit(1)
      if (!subProbe) {
        invoiceData.subtotal = invoiceData.base_amount ?? contractAmount
      }
    } catch (_) {
      // 無視
    }

    // 方向（運営者宛）に対応する列がある場合は設定
    try {
      const { error: dirProbe } = await supabaseAdmin
        .from('invoices')
        .select('direction')
        .limit(1)
      if (!dirProbe) {
        invoiceData.direction = 'to_operator'
      }
    } catch (_) {
      // 列が無い環境
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
        title: '業務完了届が作成されました（運営宛）',
        message: `案件「${project.title}」の業務完了届が作成され、運営へ送信されました。請求書ページで確認できます。`,
        type: 'completion_report_created',
        data: { project_id: effectiveProjectId, invoice_id: insertedInvoice.id }
      })

    if (notificationError) {
      console.error('通知作成エラー(受注者):', notificationError)
    }

    // 発注者への完了届作成通知は送らない（業務完了の準備通知は別途 completed 遷移時に送信）

    return NextResponse.json({
      message: '請求書が正常に作成されました。受注者に通知が送信されます。',
      invoice: { ...insertedInvoice, invoice_number: insertedInvoice.invoice_number || invoiceNumber },
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
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .maybeSingle()

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
      const amountExcl = (invoice as any).base_amount ?? (invoice as any).subtotal ?? 0
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

    // 請求書一覧を取得（フロントの期待形に整形）
    let baseQuery = supabaseAdmin
      .from('invoices')
      .select(`
        id,
        invoice_number,
        status,
        issue_date,
        due_date,
        base_amount,
        system_fee,
        total_amount,
        created_at,
        project_id,
        contract_id,
        org_id,
        projects:project_id ( id, title, contractor_id ),
        contracts:contract_id ( id, bid_amount ),
        organizations:org_id ( id, name )
      `)

    if (membership?.role === 'OrgAdmin') {
      baseQuery = baseQuery.eq('org_id', membership.org_id)
    } else {
      // 受注者: contractor_id=自分 もしくは contract_id が自分の契約
      const { data: myContracts } = await supabaseAdmin
        .from('contracts')
        .select('id')
        .eq('contractor_id', userProfile.id)

      const myContractIds = (myContracts || []).map((c: any) => c.id)
      if (myContractIds.length > 0) {
        const inList = myContractIds.map((id: string) => `${id}`).join(',')
        // or() に in 条件を含める（ANDにならないよう一括で指定）
        baseQuery = baseQuery.or(`contractor_id.eq.${userProfile.id},contractor_id.eq.${user.id},contract_id.in.(${inList})`)

        // 追加でプロジェクトIDでも拾う
        const { data: myProjects } = await supabaseAdmin
          .from('contracts')
          .select('project_id')
          .in('id', myContractIds)
        const myProjectIds = Array.from(new Set((myProjects || []).map((p: any) => p.project_id)))
        if (myProjectIds.length > 0) {
          baseQuery = baseQuery.or(`project_id.in.(${myProjectIds.join(',')})`)
        }
      } else {
        baseQuery = baseQuery.or(`contractor_id.eq.${userProfile.id},contractor_id.eq.${user.id}`)
      }
    }

    const { data: rawInvoices, error: invoicesError } = await baseQuery.order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('請求書取得エラー:', invoicesError)
      return NextResponse.json({ message: '請求書の取得に失敗しました' }, { status: 500 })
    }

    const formatted = (rawInvoices || []).map((inv: any) => ({
      id: inv.id,
      invoice_number: inv.invoice_number || `INV-${String(inv.id).slice(0,8).toUpperCase()}`,
      status: inv.status,
      issue_date: inv.issue_date,
      due_date: inv.due_date,
      base_amount: inv.base_amount ?? inv.subtotal ?? 0,
      system_fee: inv.system_fee ?? inv.fee_amount ?? 0,
      total_amount: inv.total_amount ?? 0,
      project: {
        id: inv.projects?.id,
        title: inv.projects?.title,
        contractor_id: inv.projects?.contractor_id
      },
      contract: {
        id: inv.contracts?.id,
        bid_amount: inv.contracts?.bid_amount
      },
      client_org: {
        id: inv.organizations?.id,
        name: inv.organizations?.name
      }
    }))

    return NextResponse.json({ invoices: formatted }, { status: 200 })

  } catch (error) {
    console.error('請求書取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}