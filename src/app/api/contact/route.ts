import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { subject, message, related_invoice_id, type } = body

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
      .select('id, display_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザー情報の取得に失敗しました' },
        { status: 400 }
      )
    }

    // バリデーション
    if (!subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { message: '件名とメッセージは必須です' },
        { status: 400 }
      )
    }

    // 問い合わせをデータベースに保存
    const { data: contact, error: contactError } = await supabaseAdmin
      .from('contacts')
      .insert({
        user_id: userProfile.id,
        subject: subject.trim(),
        message: message.trim(),
        type: type || 'general',
        related_invoice_id: related_invoice_id || null,
        status: 'pending'
      })
      .select()
      .single()

    if (contactError) {
      console.error('問い合わせ保存エラー:', contactError)
      return NextResponse.json(
        { message: '問い合わせの送信に失敗しました' },
        { status: 500 }
      )
    }

    // 管理者に通知を送信（システム管理者向け）
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: 'system', // システム管理者のID（実際の実装では適切なIDを設定）
        title: '新しい問い合わせが届きました',
        message: `${userProfile.display_name}さんから問い合わせが届きました。件名: ${subject}`,
        type: 'contact_received',
        related_id: contact.id
      })

    if (notificationError) {
      console.error('通知作成エラー:', notificationError)
      // 通知エラーは問い合わせ送信を妨げない
    }

    return NextResponse.json({
      message: '問い合わせを送信しました',
      contact: {
        id: contact.id,
        subject: contact.subject,
        status: contact.status
      }
    })

  } catch (error) {
    console.error('問い合わせ送信エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}