import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// Box Webhook署名を検証
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  primaryKey: string,
  secondaryKey?: string
): boolean {
  if (!signature) return false

  const hmac1 = crypto.createHmac('sha256', primaryKey)
  hmac1.update(body)
  const calculatedSignature1 = hmac1.digest('base64')

  if (signature === calculatedSignature1) return true

  if (secondaryKey) {
    const hmac2 = crypto.createHmac('sha256', secondaryKey)
    hmac2.update(body)
    const calculatedSignature2 = hmac2.digest('base64')

    if (signature === calculatedSignature2) return true
  }

  return false
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    const signature = request.headers.get('box-signature-primary')

    // Webhook署名を検証（本番環境では必須）
    const webhookPrimaryKey = process.env.BOX_WEBHOOK_PRIMARY_KEY
    const webhookSecondaryKey = process.env.BOX_WEBHOOK_SECONDARY_KEY

    if (webhookPrimaryKey) {
      const isValid = verifyWebhookSignature(
        body,
        signature,
        webhookPrimaryKey,
        webhookSecondaryKey
      )

      if (!isValid) {
        console.error('❌ Box Webhook署名検証失敗')
        return NextResponse.json({ message: 'Invalid signature' }, { status: 401 })
      }
    }

    const payload = JSON.parse(body)

    console.log('📨 Box Webhook受信:', {
      trigger: payload.trigger,
      source: payload.source
    })

    // Box Signの署名完了イベントを処理
    if (payload.trigger === 'SIGN_REQUEST.COMPLETED') {
      const signRequestId = payload.source?.id

      if (!signRequestId) {
        console.error('❌ 署名リクエストIDが見つかりません')
        return NextResponse.json({ message: 'Missing sign request ID' }, { status: 400 })
      }

      console.log('✅ 署名完了イベント:', signRequestId)

      // 該当する契約を検索
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select(`
          id,
          contractor_id,
          order_acceptance_signed_at,
          projects!inner(
            id,
            title,
            created_by,
            org_id
          )
        `)
        .eq('order_acceptance_sign_request_id', signRequestId)
        .single()

      if (contractError || !contract) {
        console.error('❌ 契約が見つかりません:', signRequestId)
        return NextResponse.json({ message: 'Contract not found' }, { status: 404 })
      }

      // 既に署名完了処理済みの場合はスキップ
      if (contract.order_acceptance_signed_at) {
        console.log('ℹ️ 既に署名完了処理済み')
        return NextResponse.json({ message: 'Already processed' }, { status: 200 })
      }

      console.log('🔄 署名完了処理を開始:', contract.id)

      // 署名完了確認APIを内部呼び出し
      const checkResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/contracts/${contract.id}/order-acceptance/sign/check`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (checkResponse.ok) {
        console.log('✅ 署名完了処理成功')
        return NextResponse.json({ message: 'Signature processed successfully' }, { status: 200 })
      } else {
        const errorResult = await checkResponse.json()
        console.error('❌ 署名完了処理失敗:', errorResult)
        return NextResponse.json({ message: 'Failed to process signature' }, { status: 500 })
      }
    }

    // その他のイベントはログのみ
    console.log('ℹ️ Box Webhookイベント受信（処理なし）:', payload.trigger)
    return NextResponse.json({ message: 'Event received' }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Box Webhook処理エラー:', error)
    return NextResponse.json({
      message: 'Webhook processing failed',
      error: error.message
    }, { status: 500 })
  }
}
