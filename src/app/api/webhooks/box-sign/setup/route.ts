import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 管理者権限チェック
async function checkAdminPermission(request: NextRequest): Promise<{ authorized: boolean; user?: any; error?: string }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { authorized: false, error: '認証が必要です' }
  }

  const token = authHeader.replace('Bearer ', '')

  const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)

  if (authError || !userData.user) {
    return { authorized: false, error: '認証に失敗しました' }
  }

  // 管理者メールアドレスのチェック
  const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || []
  if (!adminEmails.includes(userData.user.email || '')) {
    return { authorized: false, error: '管理者権限が必要です' }
  }

  return { authorized: true, user: userData.user }
}

/**
 * GET: 現在登録されているWebhook一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authCheck = await checkAdminPermission(request)
    if (!authCheck.authorized) {
      return NextResponse.json({ message: authCheck.error }, { status: 401 })
    }

    console.log('📋 Webhook一覧取得開始')

    const webhooks = await boxSignAPI.listWebhooks()

    // Box Sign関連のWebhookのみをフィルタリング
    const boxSignWebhooks = webhooks.filter((webhook: any) =>
      webhook.triggers?.some((trigger: string) =>
        trigger.startsWith('SIGN_REQUEST.')
      )
    )

    return NextResponse.json({
      webhooks: boxSignWebhooks,
      total: boxSignWebhooks.length
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Webhook一覧取得エラー:', error)
    return NextResponse.json({
      message: 'Webhook一覧の取得に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

/**
 * POST: 新しいBox Sign Webhookを作成
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authCheck = await checkAdminPermission(request)
    if (!authCheck.authorized) {
      return NextResponse.json({ message: authCheck.error }, { status: 401 })
    }

    const body = await request.json()
    const { webhookUrl, triggers } = body

    if (!webhookUrl) {
      return NextResponse.json({ message: 'Webhook URLが必要です' }, { status: 400 })
    }

    if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
      return NextResponse.json({ message: 'トリガーが必要です' }, { status: 400 })
    }

    console.log('🔄 Webhook作成開始:', { webhookUrl, triggers })

    // 既に同じURLのWebhookが存在するかチェック
    const existingWebhook = await boxSignAPI.findWebhookByUrl(webhookUrl)
    if (existingWebhook) {
      return NextResponse.json({
        message: 'このURLのWebhookは既に存在します',
        webhook: existingWebhook
      }, { status: 409 })
    }

    // Webhookを作成
    const webhook = await boxSignAPI.createWebhook(webhookUrl, triggers)

    return NextResponse.json({
      message: 'Webhookの作成に成功しました',
      webhook
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Webhook作成エラー:', error)
    return NextResponse.json({
      message: 'Webhookの作成に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}

/**
 * DELETE: Webhookを削除
 */
export async function DELETE(request: NextRequest) {
  try {
    // 管理者権限チェック
    const authCheck = await checkAdminPermission(request)
    if (!authCheck.authorized) {
      return NextResponse.json({ message: authCheck.error }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const webhookId = searchParams.get('id')

    if (!webhookId) {
      return NextResponse.json({ message: 'Webhook IDが必要です' }, { status: 400 })
    }

    console.log('🗑️ Webhook削除開始:', webhookId)

    const success = await boxSignAPI.deleteWebhook(webhookId)

    if (!success) {
      return NextResponse.json({
        message: 'Webhookの削除に失敗しました'
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Webhookの削除に成功しました'
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Webhook削除エラー:', error)
    return NextResponse.json({
      message: 'Webhookの削除に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
