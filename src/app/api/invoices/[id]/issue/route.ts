import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: invoiceId } = params

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

    // ユーザープロフィール取得
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザー情報の取得に失敗しました' },
        { status: 400 }
      )
    }

    // 請求書を取得
    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        contractor_id,
        status,
        projects (
          id,
          title,
          org_id
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

    // 受注者のみ発行可能
    if (invoice.contractor_id !== userProfile.id) {
      return NextResponse.json(
        { message: 'この請求書を発行する権限がありません' },
        { status: 403 }
      )
    }

    // 下書き状態のみ発行可能
    if (invoice.status !== 'draft') {
      return NextResponse.json(
        { message: 'この請求書は既に発行済みです' },
        { status: 400 }
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

    // 発注者に通知を送信
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: (invoice.projects as any)?.org_id, // 発注者組織のID
        title: '請求書が発行されました',
        message: `案件「${(invoice.projects as any)?.title}」の請求書が発行されました。支払いをお願いします。`,
        type: 'invoice_issued',
        related_id: invoiceId
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
      // 通知エラーは請求書発行を妨げない
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
