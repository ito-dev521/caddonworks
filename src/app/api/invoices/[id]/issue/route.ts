import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const invoiceId = params.id

    // 認証ヘッダーからトークンを取得
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

    // 請求書の存在確認と権限チェック
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        contracts!inner(
          projects!inner(
            org_id,
            title
          )
        )
      `)
      .eq('id', invoiceId)
      .single()

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { message: '請求書が見つかりません' },
        { status: 404 }
      )
    }

    // 組織の管理者権限をチェック
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', user.id)
      .eq('org_id', invoice.contracts.projects.org_id)
      .single()

    if (membershipError || !membership || membership.role !== 'OrgAdmin') {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません' },
        { status: 403 }
      )
    }

    // 請求書を発行済みに更新
    const { data: updatedInvoice, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'issued',
        issue_date: new Date().toISOString().split('T')[0]
      })
      .eq('id', invoiceId)
      .select()
      .single()

    if (updateError) {
      console.error('請求書発行エラー:', updateError)
      return NextResponse.json(
        { message: '請求書の発行に失敗しました' },
        { status: 500 }
      )
    }

    // 受注者に通知を送信
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: invoice.contractor_id,
        title: '請求書が発行されました',
        message: `案件「${invoice.contracts.projects.title}」の請求書が発行されました。請求書ページで確認できます。`,
        type: 'invoice_issued',
        data: {
          invoice_id: invoiceId,
          project_id: invoice.contracts.projects.id
        }
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
    }

    return NextResponse.json({
      message: '請求書が正常に発行されました',
      invoice: updatedInvoice
    })

  } catch (error) {
    console.error('請求書発行エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}