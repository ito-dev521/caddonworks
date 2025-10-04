import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { generateCompletionReportPDF } from '@/lib/completion-report-generator'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 認証チェック
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
      .select('id, display_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 完了届データを取得
    const { data: report, error: reportError } = await supabaseAdmin
      .from('completion_reports')
      .select(`
        *,
        projects!inner(
          id,
          title,
          location,
          category,
          start_date,
          end_date,
          budget
        ),
        contracts!inner(
          id,
          bid_amount,
          start_date,
          end_date,
          signed_at
        ),
        organizations!inner(
          id,
          name
        )
      `)
      .eq('id', params.id)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // アクセス権限チェック
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    const isContractor = memberships?.some(m => m.role === 'Contractor')
    const isOrgAdmin = memberships?.some(m => m.role === 'OrgAdmin' && m.org_id === report.org_id)

    if (!isContractor && !isOrgAdmin) {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    // 受注者の場合は自分の完了届のみ
    if (isContractor && report.contractor_id !== userProfile.id) {
      return NextResponse.json({ message: 'アクセス権限がありません' }, { status: 403 })
    }

    // 受注者情報を取得
    const { data: contractor } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .eq('id', report.contractor_id)
      .single()

    // PDF生成
    const pdfBuffer = await generateCompletionReportPDF({
      project: {
        ...report.projects,
        client_organization: report.organizations,
        contractor_organization: null
      },
      contract: report.contracts,
      contractor: contractor || userProfile,
      completionDate: report.actual_completion_date,
      createdAt: report.created_at
    })

    // PDFレスポンスを返す
    return new NextResponse(pdfBuffer as unknown as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="completion-report-${params.id}.pdf"`
      }
    })

  } catch (error) {
    console.error('Completion report PDF generation error:', error)
    return NextResponse.json({ message: 'PDFの生成に失敗しました' }, { status: 500 })
  }
}