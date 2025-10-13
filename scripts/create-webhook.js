// Box Sign Webhook作成スクリプト
// 使い方: node scripts/create-webhook.js

// .env.localを読み込む
require('dotenv').config({ path: '.env.local' })

const BOX_CLIENT_ID = process.env.BOX_CLIENT_ID
const BOX_CLIENT_SECRET = process.env.BOX_CLIENT_SECRET
const BOX_ENTERPRISE_ID = process.env.BOX_ENTERPRISE_ID

if (!BOX_CLIENT_ID || !BOX_CLIENT_SECRET || !BOX_ENTERPRISE_ID) {
  console.error('❌ Box環境変数が設定されていません')
  process.exit(1)
}

// JWT認証を使用してアクセストークンを取得
async function getBoxAccessToken() {
  const BoxSDK = require('box-node-sdk')

  const sdk = BoxSDK.getPreconfiguredInstance({
    boxAppSettings: {
      clientID: BOX_CLIENT_ID,
      clientSecret: BOX_CLIENT_SECRET,
      appAuth: {
        publicKeyID: process.env.BOX_PUBLIC_KEY_ID,
        privateKey: process.env.BOX_JWT_PRIVATE_KEY,
        passphrase: process.env.BOX_JWT_PRIVATE_KEY_PASSPHRASE
      }
    },
    enterpriseID: BOX_ENTERPRISE_ID
  })

  const client = sdk.getAppAuthClient('enterprise')
  const tokenInfo = await client.getTokensJWTGrant()
  return tokenInfo.accessToken
}

async function createWebhook() {
  try {
    console.log('🔄 アクセストークン取得中...')
    const accessToken = await getBoxAccessToken()
    console.log('✅ アクセストークン取得成功')

    const webhookUrl = process.env.NEXT_PUBLIC_SITE_URL
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/box-sign`
      : 'http://localhost:3000/api/webhooks/box-sign'

    const webhookData = {
      target: {
        type: 'sign-request'
      },
      address: webhookUrl,
      triggers: [
        'SIGN_REQUEST.COMPLETED',
        'SIGN_REQUEST.DECLINED',
        'SIGN_REQUEST.EXPIRED'
      ]
    }

    console.log('🔄 Webhook作成中...')
    console.log('Webhook URL:', webhookUrl)

    const response = await fetch('https://api.box.com/2.0/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(webhookData)
    })

    const result = await response.json()

    if (response.ok) {
      console.log('✅ Webhook作成成功!')
      console.log('Webhook ID:', result.id)
      console.log('Webhook URL:', result.address)
      console.log('Triggers:', result.triggers)
      console.log('\n📝 次のステップ:')
      console.log('1. Box Developer Consoleを開く: https://app.box.com/developers/console')
      console.log('2. 左メニューから「Webhooks」をクリック')
      console.log('3. 作成されたWebhookをクリック')
      console.log('4. Primary KeyとSecondary Keyをコピー')
      console.log('5. .env.localに以下を追加:')
      console.log('   BOX_WEBHOOK_PRIMARY_KEY=<Primary Key>')
      console.log('   BOX_WEBHOOK_SECONDARY_KEY=<Secondary Key>')
      console.log('6. サーバーを再起動')
    } else {
      console.error('❌ Webhook作成失敗')
      console.error('Status:', response.status)
      console.error('Error:', result)
    }
  } catch (error) {
    console.error('❌ エラー:', error.message)
    console.error(error)
  }
}

createWebhook()
