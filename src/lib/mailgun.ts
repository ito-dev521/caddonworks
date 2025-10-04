// Mailgun設定の初期化を動的に行う
let mg: any = null
const DOMAIN = process.env.MAILGUN_DOMAIN || ''

// Mailgunクライアントを動的に初期化する関数
const initMailgun = async () => {
  if (mg) return mg

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    return null
  }

  try {
    const formData = await import('form-data')
    const Mailgun = await import('mailgun.js')

    const mailgun = new Mailgun.default(formData.default)
    mg = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: 'https://api.mailgun.net'
    })
    return mg
  } catch (error) {
    console.error('Failed to initialize Mailgun:', error)
    return null
  }
}

export interface ContractorWelcomeEmailData {
  email: string
  displayName: string
  password: string
  loginUrl: string
}

export const sendContractorWelcomeEmail = async (data: ContractorWelcomeEmailData) => {
  const { email, displayName, password, loginUrl } = data

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>受注者登録完了のお知らせ</title>
        <style>
            body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0066CC 0%, #10B981 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .credentials { background: #f9fafb; border: 1px solid #d1d5db; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .button { display: inline-block; background: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 受注者登録が完了しました</h1>
                <p>土木設計業務プラットフォームへようこそ</p>
            </div>

            <div class="content">
                <p>こんにちは、${displayName} 様</p>

                <p>この度は土木設計業務プラットフォームにご登録いただき、誠にありがとうございます。<br>
                受注者としての登録が正常に完了いたしました。</p>

                <div class="credentials">
                    <h3>📋 ログイン情報</h3>
                    <p><strong>メールアドレス:</strong> ${email}</p>
                    <p><strong>初期パスワード:</strong> <code>${password}</code></p>
                </div>

                <div class="warning">
                    <p><strong>⚠️ セキュリティのお願い</strong></p>
                    <p>初回ログイン後は、セキュリティ向上のため、必ずパスワードを変更してください。</p>
                </div>

                <p>下記のボタンからログインして、プロフィールを完成させましょう：</p>

                <div style="text-align: center;">
                    <a href="${loginUrl}" class="button">プラットフォームにログイン</a>
                </div>

                <h3>📈 次のステップ</h3>
                <ol>
                    <li>プロフィール情報の入力・更新</li>
                    <li>専門分野・資格情報の登録</li>
                    <li>ポートフォリオのアップロード</li>
                    <li>案件への応募開始</li>
                </ol>

                <p>ご不明な点がございましたら、お気軽にお問い合わせください。<br>
                土木設計業務プラットフォームでの活動を心よりお待ちしております。</p>

                <div class="footer">
                    <p>土木設計業務プラットフォーム運営チーム<br>
                    Civil Engineering Platform</p>
                    <p>このメールに心当たりがない場合は、お手数ですがサポートまでご連絡ください。</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `

  const textContent = `
受注者登録完了のお知らせ

こんにちは、${displayName} 様

この度は土木設計業務プラットフォームにご登録いただき、誠にありがとうございます。
受注者としての登録が正常に完了いたしました。

【ログイン情報】
メールアドレス: ${email}
初期パスワード: ${password}

【重要】セキュリティのため、初回ログイン後は必ずパスワードを変更してください。

ログインURL: ${loginUrl}

次のステップ:
1. プロフィール情報の入力・更新
2.専門分野・資格情報の登録
3. ポートフォリオのアップロード
4.案件への応募開始

ご不明な点がございましたら、お気軽にお問い合わせください。

土木設計業務プラットフォーム運営チーム
Civil Engineering Platform
  `

  // Mailgunを動的に初期化
  const mailgunClient = await initMailgun()

  if (!mailgunClient || !DOMAIN) {
    console.warn('Mailgun not configured, skipping email send')
    return { message: 'Email sending skipped (Mailgun not configured)' }
  }

  try {
    const result = await mailgunClient.messages.create(DOMAIN, {
      from: `土木設計業務プラットフォーム <noreply@${DOMAIN}>`,
      to: [email],
      subject: '【重要】受注者登録完了とログイン情報のご案内',
      text: textContent,
      html: htmlContent
    })

    console.log('Email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

export const sendPasswordResetEmail = async (email: string, resetLink: string, displayName: string) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>パスワードリセットのご案内</title>
        <style>
            body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0066CC 0%, #10B981 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; background: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
            .warning { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 パスワードリセット</h1>
                <p>土木設計業務プラットフォーム</p>
            </div>

            <div class="content">
                <p>こんにちは、${displayName} 様</p>

                <p>パスワードリセットのリクエストを受信しました。</p>

                <div class="warning">
                    <p><strong>⏰ 有効期限: 24時間</strong></p>
                    <p>このリンクは24時間後に無効になります。</p>
                </div>

                <div style="text-align: center;">
                    <a href="${resetLink}" class="button">パスワードを再設定</a>
                </div>

                <p>もしこのリクエストに心当たりがない場合は、このメールを無視してください。</p>

                <div class="footer">
                    <p>土木設計業務プラットフォーム運営チーム<br>
                    Civil Engineering Platform</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `

  // Mailgunを動的に初期化
  const mailgunClient = await initMailgun()

  if (!mailgunClient || !DOMAIN) {
    console.warn('Mailgun not configured, skipping password reset email send')
    return { message: 'Password reset email sending skipped (Mailgun not configured)' }
  }

  try {
    const result = await mailgunClient.messages.create(DOMAIN, {
      from: `土木設計業務プラットフォーム <noreply@${DOMAIN}>`,
      to: [email],
      subject: 'パスワードリセットのご案内',
      html: htmlContent
    })

    return result
  } catch (error) {
    console.error('Failed to send password reset email:', error)
    throw error
  }
}

// 会員レベル変更承認メール
export const sendLevelChangeApprovedEmail = async (
  email: string,
  displayName: string,
  newLevel: 'beginner' | 'intermediate' | 'advanced'
) => {
  const levelLabel = newLevel === 'beginner' ? '初級' : newLevel === 'intermediate' ? '中級' : '上級'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>会員レベル変更が承認されました</title>
        <style>
            body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0066CC 0%, #10B981 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .info-box { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ 会員レベル変更が承認されました</h1>
                <p>土木設計業務プラットフォーム</p>
            </div>

            <div class="content">
                <p>こんにちは、${displayName} 様</p>

                <p>会員レベル変更リクエストが承認されました。</p>

                <div class="info-box">
                    <p style="margin: 0;"><strong>新しい会員レベル:</strong> ${levelLabel}</p>
                </div>

                <p>新しいレベルに応じた案件が表示されるようになります。引き続き土木設計業務プラットフォームをご利用ください。</p>

                <div class="footer">
                    <p>土木設計業務プラットフォーム運営チーム<br>
                    Civil Engineering Platform</p>
                    <p>このメールに心当たりがない場合は、お手数ですがサポートまでご連絡ください。</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `

  const mailgunClient = await initMailgun()

  if (!mailgunClient || !DOMAIN) {
    console.warn('Mailgun not configured, skipping level change approved email send')
    return { message: 'Email sending skipped (Mailgun not configured)' }
  }

  try {
    const result = await mailgunClient.messages.create(DOMAIN, {
      from: `土木設計業務プラットフォーム <noreply@${DOMAIN}>`,
      to: [email],
      subject: '【Caddon Works】会員レベル変更が承認されました',
      html: htmlContent
    })

    console.log('Level change approved email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send level change approved email:', error)
    throw error
  }
}

// 会員レベル変更却下メール
export const sendLevelChangeRejectedEmail = async (
  email: string,
  displayName: string,
  reason: string
) => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>会員レベル変更が却下されました</title>
        <style>
            body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #dc2626 0%, #f59e0b 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .reject-box { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>❌ 会員レベル変更が却下されました</h1>
                <p>土木設計業務プラットフォーム</p>
            </div>

            <div class="content">
                <p>こんにちは、${displayName} 様</p>

                <p>会員レベル変更リクエストが却下されました。</p>

                <div class="reject-box">
                    <p style="margin: 0 0 10px 0;"><strong>却下理由:</strong></p>
                    <p style="margin: 0;">${reason}</p>
                </div>

                <p>ご不明な点がございましたら、お気軽にお問い合わせください。</p>

                <div class="footer">
                    <p>土木設計業務プラットフォーム運営チーム<br>
                    Civil Engineering Platform</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `

  const mailgunClient = await initMailgun()

  if (!mailgunClient || !DOMAIN) {
    console.warn('Mailgun not configured, skipping level change rejected email send')
    return { message: 'Email sending skipped (Mailgun not configured)' }
  }

  try {
    const result = await mailgunClient.messages.create(DOMAIN, {
      from: `土木設計業務プラットフォーム <noreply@${DOMAIN}>`,
      to: [email],
      subject: '【Caddon Works】会員レベル変更が却下されました',
      html: htmlContent
    })

    console.log('Level change rejected email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send level change rejected email:', error)
    throw error
  }
}

// 会員レベル直接変更メール
export const sendLevelChangedByAdminEmail = async (
  email: string,
  displayName: string,
  newLevel: 'beginner' | 'intermediate' | 'advanced'
) => {
  const levelLabel = newLevel === 'beginner' ? '初級' : newLevel === 'intermediate' ? '中級' : '上級'

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>会員レベルが変更されました</title>
        <style>
            body { font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0066CC 0%, #10B981 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
            .info-box { background: #f3f4f6; border-radius: 8px; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔄 会員レベルが変更されました</h1>
                <p>土木設計業務プラットフォーム</p>
            </div>

            <div class="content">
                <p>こんにちは、${displayName} 様</p>

                <p>会員レベルが運営側により変更されました。</p>

                <div class="info-box">
                    <p style="margin: 0;"><strong>新しい会員レベル:</strong> ${levelLabel}</p>
                </div>

                <p>新しいレベルに応じた案件が表示されるようになります。引き続き土木設計業務プラットフォームをご利用ください。</p>

                <div class="footer">
                    <p>土木設計業務プラットフォーム運営チーム<br>
                    Civil Engineering Platform</p>
                    <p>ご不明な点がございましたら、お問い合わせください。</p>
                </div>
            </div>
        </div>
    </body>
    </html>
  `

  const mailgunClient = await initMailgun()

  if (!mailgunClient || !DOMAIN) {
    console.warn('Mailgun not configured, skipping level changed email send')
    return { message: 'Email sending skipped (Mailgun not configured)' }
  }

  try {
    const result = await mailgunClient.messages.create(DOMAIN, {
      from: `土木設計業務プラットフォーム <noreply@${DOMAIN}>`,
      to: [email],
      subject: '【Caddon Works】会員レベルが変更されました',
      html: htmlContent
    })

    console.log('Level changed email sent successfully:', result)
    return result
  } catch (error) {
    console.error('Failed to send level changed email:', error)
    throw error
  }
}