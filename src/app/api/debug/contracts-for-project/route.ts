import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('project_id')

    if (!projectId) {
      return NextResponse.json({
        message: 'プロジェクトIDが指定されていません',
        error: 'Missing project ID'
      }, { status: 400 })
    }

    console.log('=== プロジェクトの契約確認開始 ===')
    console.log('プロジェクトID:', projectId)

    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    console.log('プロジェクト取得結果:', { project, projectError })

    if (projectError) {
      return NextResponse.json({
        message: 'プロジェクトが見つかりません',
        projectId,
        error: projectError.message
      }, { status: 404 })
    }

    // このプロジェクトの契約を取得
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('project_id', projectId)

    console.log('契約取得結果:', { contracts, contractsError })

    // 入札情報も取得
    const { data: bids, error: bidsError } = await supabaseAdmin
      .from('bids')
      .select('*')
      .eq('project_id', projectId)

    console.log('入札取得結果:', { bids, bidsError })

    console.log('=== プロジェクトの契約確認完了 ===')

    return NextResponse.json({
      message: 'プロジェクトの契約確認完了',
      project,
      contracts,
      bids,
      summary: {
        project_id: projectId,
        project_title: project?.title,
        project_status: project?.status,
        contracts_count: contracts?.length || 0,
        bids_count: bids?.length || 0
      }
    }, { status: 200 })

  } catch (error) {
    console.error('プロジェクト契約確認エラー:', error)
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
