import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

export async function GET(request: NextRequest) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
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
      console.error('認証エラー:', authError)
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // URLパラメータからlimitを取得（デフォルトは5件）
    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const limit = limitParam ? parseInt(limitParam) : 5

    // 受注者の契約履歴を取得（完了済み案件のみ、最新順）
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        project_id,
        bid_amount,
        signed_at,
        order_acceptance_signed_at,
        created_at,
        status,
        projects!inner(
          id,
          title,
          status,
          completed_at
        ),
        organizations(
          name
        )
      `)
      .eq('contractor_id', userProfile.id)
      .eq('status', 'signed')
      .eq('projects.status', 'completed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (contractsError) {
      console.error('契約履歴取得エラー:', contractsError)
      return NextResponse.json(
        { message: '契約履歴の取得に失敗しました' },
        { status: 500 }
      )
    }

    // 受注者の契約総数を取得（完了済みのみ）
    const { count, error: countError } = await supabaseAdmin
      .from('contracts')
      .select('id, projects!inner(id, status)', { count: 'exact', head: true })
      .eq('contractor_id', userProfile.id)
      .eq('status', 'signed')
      .eq('projects.status', 'completed')

    if (countError) {
      console.error('契約総数取得エラー:', countError)
    }

    // 各契約に対して評価を取得
    const contractsWithEvaluations = await Promise.all(
      contracts.map(async (contract) => {
        const { data: evaluation } = await supabaseAdmin
          .from('evaluations')
          .select('overall_rating, created_at')
          .eq('contract_id', contract.id)
          .maybeSingle()

        return {
          id: contract.id,
          project_id: contract.project_id,
          project_title: (contract.projects as any)?.title,
          project_status: (contract.projects as any)?.status,
          organization_name: (contract.organizations as any)?.name,
          contract_amount: contract.bid_amount,
          signed_at: contract.signed_at,
          order_acceptance_signed_at: contract.order_acceptance_signed_at,
          completed_at: (contract.projects as any)?.completed_at,
          evaluation: evaluation ? {
            overall_rating: evaluation.overall_rating,
            created_at: evaluation.created_at
          } : null
        }
      })
    )

    return NextResponse.json({
      contracts: contractsWithEvaluations,
      total: count || 0,
      showing: contracts.length
    }, { status: 200 })

  } catch (error) {
    console.error('契約履歴取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
