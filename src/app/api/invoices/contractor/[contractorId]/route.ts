import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(
  request: NextRequest,
  { params }: { params: { contractorId: string } }
) {
  try {
    const { contractorId } = params

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

    // 自分の請求書のみ取得可能
    if (userProfile.id !== contractorId) {
      return NextResponse.json(
        { message: '他のユーザーの請求書は閲覧できません' },
        { status: 403 }
      )
    }

    // 受注者の請求書を取得
    const { data: invoices, error: invoicesError } = await supabaseAdmin
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
        projects (
          id,
          title,
          contractor_id
        ),
        contracts (
          id,
          bid_amount
        ),
        organizations (
          id,
          name
        )
      `)
      .eq('contractor_id', contractorId)
      .order('created_at', { ascending: false })

    if (invoicesError) {
      console.error('請求書取得エラー:', invoicesError)
      return NextResponse.json(
        { message: '請求書の取得に失敗しました' },
        { status: 500 }
      )
    }

    // データを整形
    const formattedInvoices = invoices?.map(invoice => ({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      base_amount: invoice.base_amount,
      system_fee: invoice.system_fee,
      total_amount: invoice.total_amount,
      project: {
        id: (invoice.projects as any)?.id,
        title: (invoice.projects as any)?.title,
        contractor_id: (invoice.projects as any)?.contractor_id
      },
      contract: {
        id: (invoice.contracts as any)?.id,
        bid_amount: (invoice.contracts as any)?.bid_amount
      },
      client_org: {
        id: (invoice.organizations as any)?.id,
        name: (invoice.organizations as any)?.name
      }
    })) || []

    return NextResponse.json({
      invoices: formattedInvoices
    })

  } catch (error) {
    console.error('請求書取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
