import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// デバッグ用: 契約データを確認
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseAdmin()

    const contractId = params.id

    // 契約データを取得
    const { data: contract, error: cErr } = await supabase
      .from('contracts')
      .select('id, project_id, contract_title, contractor_id, org_id, status')
      .eq('id', contractId)
      .single()

    if (cErr) {
      return NextResponse.json({
        error: '契約取得エラー',
        message: cErr.message,
        contractId
      })
    }

    if (!contract) {
      return NextResponse.json({
        error: '契約が見つかりません',
        contractId
      })
    }

    const result: any = {
      contract: {
        id: contract.id,
        project_id: contract.project_id || '❌ NULL',
        contract_title: contract.contract_title,
        contractor_id: contract.contractor_id,
        org_id: contract.org_id,
        status: contract.status
      }
    }

    // project_idがある場合、プロジェクトを確認
    if (contract.project_id) {
      const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('id', contract.project_id)
        .single()

      if (pErr || !project) {
        result.project = {
          error: 'プロジェクトが見つかりません',
          message: pErr?.message,
          project_id: contract.project_id
        }
      } else {
        result.project = {
          id: project.id,
          title: project.title,
          status: project.status
        }
      }
    } else {
      result.project = {
        error: 'contract.project_idがNULL'
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({
      error: 'サーバーエラー',
      message: error.message
    }, { status: 500 })
  }
}
