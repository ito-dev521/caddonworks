import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ message: 'projectIdが必要です' }, { status: 400 })
    }

    // 1. プロジェクト情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, status, contractor_id, org_id')
      .eq('id', projectId)
      .single()

    // 2. 該当プロジェクトの契約情報を取得
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('project_id', projectId)

    // 3. 受注者情報を取得
    let contractor = null
    if (project?.contractor_id) {
      const { data: contractorData } = await supabaseAdmin
        .from('users')
        .select('id, display_name, email')
        .eq('id', project.contractor_id)
        .single()
      contractor = contractorData
    }

    return NextResponse.json({
      project,
      projectError,
      contracts,
      contractsError,
      contractor,
      message: '契約データの調査結果'
    }, { status: 200 })

  } catch (error) {
    console.error('Contract debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
