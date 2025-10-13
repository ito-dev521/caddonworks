import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 注文請書署名ステータスの更新（Webhook用）
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id
    const { signRequestId, status } = await request.json()

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        contractor_id,
        order_acceptance_sign_request_id,
        projects!inner(
          id,
          title,
          created_by,
          organizations!inner(
            id,
            name
          )
        )
      `)
      .eq('id', contractId)
      .eq('order_acceptance_sign_request_id', signRequestId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // Box Signから詳細ステータスを取得
    const signatureStatus = await boxSignAPI.getSignatureStatus(signRequestId)

    if (!signatureStatus.success) {
      return NextResponse.json({
        message: '署名ステータスの取得に失敗しました',
        error: signatureStatus.error
      }, { status: 500 })
    }

    const project = contract.projects

    // 署名完了の場合
    if (status === 'signed' || signatureStatus.data?.status === 'signed') {
      // 契約に署名完了情報を記録
      const { error: updateError } = await supabaseAdmin
        .from('contracts')
        .update({
          order_acceptance_signed_at: new Date().toISOString()
        })
        .eq('id', contractId)

      if (updateError) {
        console.error('契約更新エラー:', updateError)
        return NextResponse.json({ message: '契約の更新に失敗しました' }, { status: 500 })
      }

      // 署名完了通知を送信
      const notifications = [
        {
          user_id: contract.contractor_id,
          type: 'order_acceptance_signed',
          title: '注文請書の署名が完了しました',
          message: `プロジェクト「${project.title}」の注文請書の署名が完了しました。`,
          data: {
            project_id: project.id,
            contract_id: contractId,
            sign_request_id: signRequestId
          }
        },
        {
          user_id: project.created_by,
          type: 'order_acceptance_signed',
          title: '注文請書の署名が完了しました',
          message: `プロジェクト「${project.title}」の注文請書の署名が完了しました。`,
          data: {
            project_id: project.id,
            contract_id: contractId,
            sign_request_id: signRequestId
          }
        }
      ]

      await supabaseAdmin
        .from('notifications')
        .insert(notifications)
    }

    // 署名拒否の場合
    else if (status === 'declined' || signatureStatus.data?.status === 'declined') {
      const declinedSigner = signatureStatus.data?.signers?.find(s => s.hasDeclined)

      const notifications = [
        {
          user_id: contract.contractor_id,
          type: 'order_acceptance_declined',
          title: '注文請書の署名が拒否されました',
          message: `プロジェクト「${project.title}」の注文請書の署名が拒否されました。理由: ${declinedSigner?.declinedReason || '未指定'}`,
          data: {
            project_id: project.id,
            contract_id: contractId,
            sign_request_id: signRequestId,
            declined_reason: declinedSigner?.declinedReason
          }
        },
        {
          user_id: project.created_by,
          type: 'order_acceptance_declined',
          title: '注文請書の署名が拒否されました',
          message: `プロジェクト「${project.title}」の注文請書の署名が拒否されました。理由: ${declinedSigner?.declinedReason || '未指定'}`,
          data: {
            project_id: project.id,
            contract_id: contractId,
            sign_request_id: signRequestId,
            declined_reason: declinedSigner?.declinedReason
          }
        }
      ]

      await supabaseAdmin
        .from('notifications')
        .insert(notifications)
    }

    return NextResponse.json({
      message: '署名ステータスを更新しました',
      status: signatureStatus.data?.status,
      contractId
    })

  } catch (error: any) {
    console.error('❌ 注文請書署名ステータス更新エラー:', error)
    return NextResponse.json({
      message: '署名ステータスの更新に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

// 手動でのステータス同期
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        order_acceptance_sign_request_id,
        order_acceptance_signed_at
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    if (!contract.order_acceptance_sign_request_id) {
      return NextResponse.json({ message: '署名リクエストが見つかりません' }, { status: 404 })
    }

    // Box Signから最新ステータスを取得
    const signatureStatus = await boxSignAPI.getSignatureStatus(contract.order_acceptance_sign_request_id)

    if (!signatureStatus.success) {
      return NextResponse.json({
        message: '署名ステータスの取得に失敗しました',
        error: signatureStatus.error
      }, { status: 500 })
    }

    // 署名完了していて、まだ記録されていない場合は更新
    if (signatureStatus.data?.status === 'signed' && !contract.order_acceptance_signed_at) {
      const { error: updateError } = await supabaseAdmin
        .from('contracts')
        .update({
          order_acceptance_signed_at: new Date().toISOString()
        })
        .eq('id', contractId)

      if (updateError) {
        console.error('契約更新エラー:', updateError)
        return NextResponse.json({ message: '契約の更新に失敗しました' }, { status: 500 })
      }
    }

    return NextResponse.json({
      message: '署名ステータスを同期しました',
      signatureStatus: signatureStatus.data,
      localSignedAt: contract.order_acceptance_signed_at
    })

  } catch (error: any) {
    console.error('❌ 注文請書署名ステータス同期エラー:', error)
    return NextResponse.json({
      message: '署名ステータスの同期に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}