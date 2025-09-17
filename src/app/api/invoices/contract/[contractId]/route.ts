import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function GET(
  request: NextRequest,
  { params }: { params: { contractId: string } }
) {
  try {
    const { contractId } = params

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

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('id, org_id, contractor_id, project_id')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーのメンバーシップを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { message: '組織情報が見つかりません' },
        { status: 403 }
      )
    }

    // 権限チェック（発注者組織のメンバーまたは受注者のみアクセス可能）
    const isClient = membership.role === 'OrgAdmin' && membership.org_id === contract.org_id
    const isContractor = contract.contractor_id === userProfile.id

    if (!isClient && !isContractor) {
      return NextResponse.json(
        { message: 'この契約の請求書を閲覧する権限がありません' },
        { status: 403 }
      )
    }

    // 請求書を取得（最新の1件を取得）
    const { data: invoices, error: invoiceError } = await supabaseAdmin
      .from('invoices')
      .select(`
        id,
        status,
        issue_date,
        due_date,
        base_amount,
        system_fee,
        total_amount
      `)
      .eq('contract_id', contractId)
      .order('id', { ascending: false })
      .limit(1)

    if (invoiceError) {
      return NextResponse.json(
        { message: '請求書の取得に失敗しました' },
        { status: 500 }
      )
    }

    const invoice = invoices && invoices.length > 0 ? invoices[0] : null
    

    return NextResponse.json({
      invoice: invoice
    })

  } catch (error) {
    console.error('請求書取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
