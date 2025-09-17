import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const contractorId = searchParams.get('contractorId')

    let query = supabaseAdmin
      .from('contracts')
      .select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (contractorId) {
      query = query.eq('contractor_id', contractorId)
    }

    const { data: contracts, error: contractsError } = await query

    return NextResponse.json({
      contracts,
      contractsError,
      projectId,
      contractorId
    }, { status: 200 })

  } catch (error) {
    console.error('Contracts debug error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
