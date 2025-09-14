import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, company, phone, inquiryType, subject, message, agreeToTerms } = body

    // バリデーション
    if (!name || !email || !inquiryType || !subject || !message || !agreeToTerms) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // メールアドレスの形式チェック
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '正しいメールアドレスを入力してください' },
        { status: 400 }
      )
    }

    // お問い合わせ種別のラベルを取得
    const inquiryTypeLabels: { [key: string]: string } = {
      demo: 'デモ・資料請求',
      pricing: '料金について',
      technical: '技術的な質問',
      partnership: 'パートナーシップ',
      support: 'サポート',
      other: 'その他'
    }

    const inquiryTypeLabel = inquiryTypeLabels[inquiryType] || inquiryType

    // メール本文を作成
    const emailContent = `
お問い合わせを受け付けました。

【お問い合わせ内容】
お名前: ${name}
メールアドレス: ${email}
会社名: ${company || '未入力'}
電話番号: ${phone || '未入力'}
お問い合わせ種別: ${inquiryTypeLabel}
件名: ${subject}

【お問い合わせ内容】
${message}

---
このメールは土木設計業務プラットフォームのお問い合わせフォームから送信されました。
送信日時: ${new Date().toLocaleString('ja-JP')}
    `.trim()

    // メール送信処理
    // 実際のメール送信は、SendGrid、Nodemailer、または他のメールサービスを使用
    // ここでは、コンソールに出力してデモンストレーション
    console.log('=== お問い合わせメール ===')
    console.log('送信先: info@ii-stylelab.com')
    console.log('件名:', `[お問い合わせ] ${subject}`)
    console.log('本文:')
    console.log(emailContent)
    console.log('========================')

    // 実際のメール送信を実装する場合は、以下のようなコードを使用
    /*
    const nodemailer = require('nodemailer')
    
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: 'info@ii-stylelab.com',
      subject: `[お問い合わせ] ${subject}`,
      text: emailContent,
      html: emailContent.replace(/\n/g, '<br>'),
    })
    */

    // 自動返信メール（ユーザー宛）
    const autoReplyContent = `
${name} 様

この度は、土木設計業務プラットフォームにお問い合わせいただき、誠にありがとうございます。

以下の内容でお問い合わせを受け付けました。

【お問い合わせ内容】
件名: ${subject}
お問い合わせ種別: ${inquiryTypeLabel}

【お問い合わせ内容】
${message}

担当者より2営業日以内にご連絡いたします。
今しばらくお待ちください。

ご不明な点がございましたら、お気軽にお問い合わせください。

---
土木設計業務プラットフォーム運営事務局
Email: info@ii-stylelab.com
Tel: 03-1234-5678
受付時間: 平日 9:00-18:00
    `.trim()

    console.log('=== 自動返信メール ===')
    console.log('送信先:', email)
    console.log('件名: [自動返信] お問い合わせを受け付けました')
    console.log('本文:')
    console.log(autoReplyContent)
    console.log('====================')

    return NextResponse.json(
      { message: 'お問い合わせを受け付けました' },
      { status: 200 }
    )

  } catch (error) {
    console.error('お問い合わせ送信エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
