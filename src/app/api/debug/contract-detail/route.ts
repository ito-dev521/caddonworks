import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get('id')

    if (!contractId) {
      return NextResponse.json({
        message: '契約IDが指定されていません',
        error: 'Missing contract ID'
      }, { status: 400 })
    }


    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .single()


    if (contractError) {
      return NextResponse.json({
        message: '契約が見つかりません',
        contractId,
        error: contractError.message,
        details: contractError
      }, { status: 404 })
    }

    // 関連情報を取得
    const [projectResult, orgResult, contractorResult] = await Promise.all([
      supabaseAdmin
        .from('projects')
        .select('id, title, status')
        .eq('id', contract.project_id)
        .single(),
      supabaseAdmin
        .from('organizations')
        .select('id, name')
        .eq('id', contract.org_id)
        .single(),
      supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .eq('id', contract.contractor_id)
        .single()
        ])

    const contractWithDetails = {
      ...contract,
      project_title: projectResult.data?.title || contract.contract_title,
      project_status: projectResult.data?.status,
      org_name: orgResult.data?.name,
      contractor_name: contractorResult.data?.display_name,
      contractor_email: contractorResult.data?.email
    }


    return NextResponse.json({
      message: '契約詳細取得成功',
      contract: contractWithDetails
    }, { status: 200 })

  } catch (error) {
    console.error('契約詳細デバッグエラー:', error)
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
