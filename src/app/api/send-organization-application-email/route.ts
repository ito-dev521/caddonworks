import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { organizationName, adminName, adminEmail } = await request.json()

    if (!organizationName || !adminName || !adminEmail) {
      return NextResponse.json(
        { message: '必要な情報が不足しています' },
        { status: 400 }
      )
    }

    // メール内容を作成
    const emailSubject = `【CADDON】発注者組織登録申請を受け付けました`
    const emailBody = `
${adminName} 様

この度は、CADDONプラットフォームに発注者組織としてご登録いただき、誠にありがとうございます。

【申請内容】
組織名：${organizationName}
申請者：${adminName}
メールアドレス：${adminEmail}

お客様からの組織登録申請を正常に受け付けいたしました。

現在、運営チームにて申請内容の確認を行っております。
承認完了まで1-2営業日程度お時間をいただく場合がございます。

承認が完了次第、こちらのメールアドレス宛に承認完了のご連絡をさせていただきます。
承認後は、管理者アカウントでログインしてシステムの初期設定を行っていただけます。

ご不明な点がございましたら、下記までお気軽にお問い合わせください。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CADDONプラットフォーム 運営チーム
Email: support@caddon.jp
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

今後ともCADDONプラットフォームをよろしくお願いいたします。
`

    // Mailgun APIを使用してメール送信
    const mailgunApiKey = process.env.MAILGUN_API_KEY
    const mailgunDomain = process.env.MAILGUN_DOMAIN

    if (!mailgunApiKey || !mailgunDomain) {
      console.warn('MAILGUN_API_KEY または MAILGUN_DOMAIN が設定されていません')
      return NextResponse.json(
        { message: 'メール送信設定が不完全です' },
        { status: 500 }
      )
    }

    const formData = new FormData()
    formData.append('from', `CADDON <noreply@${mailgunDomain}>`)
    formData.append('to', adminEmail)
    formData.append('subject', emailSubject)
    formData.append('text', emailBody)

    const mailgunResponse = await fetch(`https://api.mailgun.net/v3/${mailgunDomain}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`api:${mailgunApiKey}`).toString('base64')}`
      },
      body: formData
    })

    if (!mailgunResponse.ok) {
      const errorData = await mailgunResponse.text()
      console.error('Mailgun API error:', errorData)
      return NextResponse.json(
        { message: 'メール送信に失敗しました', error: errorData },
        { status: 500 }
      )
    }

    const emailResult = await mailgunResponse.json()
    console.log('申請受付メール送信成功:', emailResult)

    return NextResponse.json({
      message: '申請受付メールを送信しました',
      emailId: emailResult.id
    }, { status: 200 })

  } catch (error) {
    console.error('申請受付メール送信エラー:', error)
    return NextResponse.json(
      { message: 'メール送信中にエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}