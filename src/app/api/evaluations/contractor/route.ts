import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const {
      project_id,
      contract_id,
      contractor_id,
      deadline_score,
      quality_score,
      communication_score,
      understanding_score,
      professionalism_score,
      comment
    } = body

    // 必須フィールドの検証
    if (!project_id || !contract_id || !contractor_id) {
      return NextResponse.json(
        { message: '必須フィールドが不足しています' },
        { status: 400 }
      )
    }

    // 評価スコアの検証
    const scores = [deadline_score, quality_score, communication_score, understanding_score, professionalism_score]
    if (scores.some(score => !score || score < 1 || score > 5)) {
      return NextResponse.json(
        { message: 'すべての評価項目で1-5のスコアを選択してください' },
        { status: 400 }
      )
    }

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
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザー情報の取得に失敗しました' },
        { status: 400 }
      )
    }

    // プロジェクトと契約の存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, contractor_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('id, contractor_id, org_id')
      .eq('id', contract_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    // 評価権限の確認（発注者組織のメンバーであることを確認）
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json(
        { message: 'このプロジェクトを評価する権限がありません' },
        { status: 403 }
      )
    }

    // 受注者IDの一致確認
    if (contract.contractor_id !== contractor_id) {
      return NextResponse.json(
        { message: '契約の受注者IDが一致しません' },
        { status: 400 }
      )
    }

    // 既存の評価があるかチェック
    const { data: existingEvaluation, error: existingError } = await supabaseAdmin
      .from('contractor_evaluations')
      .select('id')
      .eq('project_id', project_id)
      .eq('evaluator_id', userProfile.id)
      .single()

    if (existingError && existingError.code !== 'PGRST116') {
      return NextResponse.json(
        { message: '評価の確認中にエラーが発生しました' },
        { status: 500 }
      )
    }

    if (existingEvaluation) {
      return NextResponse.json(
        { message: 'このプロジェクトは既に評価済みです' },
        { status: 400 }
      )
    }

    // 評価データの保存
    const { data: evaluation, error: evaluationError } = await supabaseAdmin
      .from('contractor_evaluations')
      .insert({
        project_id,
        contract_id,
        contractor_id,
        evaluator_id: userProfile.id,
        deadline_score,
        quality_score,
        communication_score,
        understanding_score,
        professionalism_score,
        comment: comment || null
      })
      .select()
      .single()

    if (evaluationError) {
      console.error('評価保存エラー:', evaluationError)
      return NextResponse.json(
        { message: '評価の保存に失敗しました: ' + evaluationError.message },
        { status: 500 }
      )
    }

    // 受注者に評価完了通知を送信
    const { data: contractorUser, error: contractorUserError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('id', contractor_id)
      .single()

    if (!contractorUserError && contractorUser) {
      await supabaseAdmin.from('notifications').insert({
        user_id: contractorUser.id,
        type: 'evaluation_received',
        title: '新しい評価を受け取りました',
        message: `案件「${project.title}」で評価を受け取りました。プロフィールで確認できます。`,
        data: {
          project_id,
          contract_id,
          evaluation_id: evaluation.id,
          average_score: evaluation.average_score
        }
      })
    }

    // 評価完了を発注者（OrgAdmin全員）に通知
    const { data: orgAdmins } = await supabaseAdmin
      .from('memberships')
      .select('user_id')
      .eq('org_id', project.org_id)
      .eq('role', 'OrgAdmin')

    if (orgAdmins && orgAdmins.length > 0) {
      const notifications = orgAdmins.map(m => ({
        user_id: m.user_id,
        type: 'evaluation_completed',
        title: '受注者評価が完了しました',
        message: `案件「${project.title}」の受注者評価が完了しました。業務完了届の発行が可能です。`,
        data: {
          project_id,
          contract_id,
          evaluation_id: evaluation.id
        }
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return NextResponse.json({
      message: '評価が正常に保存されました',
      evaluation: {
        id: evaluation.id,
        average_score: evaluation.average_score
      }
    }, { status: 201 })

  } catch (error) {
    console.error('評価保存エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contractorId = searchParams.get('contractor_id')
    const projectId = searchParams.get('project_id')

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

    let query = supabaseAdmin
      .from('contractor_evaluations')
      .select(`
        id,
        project_id,
        contract_id,
        contractor_id,
        evaluator_id,
        deadline_score,
        quality_score,
        communication_score,
        understanding_score,
        professionalism_score,
        average_score,
        comment,
        created_at,
        projects!inner(title, org_id),
        evaluator:users!evaluator_id(display_name)
      `)

    if (contractorId) {
      query = query.eq('contractor_id', contractorId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data: evaluations, error: evaluationsError } = await query
      .order('created_at', { ascending: false })

    if (evaluationsError) {
      console.error('評価取得エラー:', evaluationsError)
      return NextResponse.json(
        { message: '評価の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      evaluations
    })

  } catch (error) {
    console.error('評価取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
