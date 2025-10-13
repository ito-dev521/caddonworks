// ESM形式でBox Webhookを作成
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// .env.localを読み込む
const envPath = join(__dirname, '..', '.env.local')
const envContent = readFileSync(envPath, 'utf8')

const envVars = {}
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

// /src/lib/box.tsのgetAppAuthAccessToken()ロジックを再現
async function getBoxAccessToken() {
  const BoxSDK = await import('box-node-sdk')

  const sdk = BoxSDK.default.getPreconfiguredInstance({
    boxAppSettings: {
      clientID: envVars.BOX_CLIENT_ID,
      clientSecret: envVars.BOX_CLIENT_SECRET,
      appAuth: {
        publicKeyID: envVars.BOX_PUBLIC_KEY_ID,
        privateKey: envVars.BOX_JWT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        passphrase: envVars.BOX_JWT_PRIVATE_KEY_PASSPHRASE
      }
    },
    enterpriseID: envVars.BOX_ENTERPRISE_ID
  })

  const client = sdk.getAppAuthClient('enterprise')
  const token = await client.exchangeToken('item_preview', `https://api.box.com`)
  return token.accessToken
}

async function createWebhook() {
  try {
    console.log('🔄 Boxアクセストークン取得中...')
    const accessToken = await getBoxAccessToken()
    console.log('✅ トークン取得成功')

    const webhookUrl = envVars.NEXT_PUBLIC_SITE_URL
      ? `${envVars.NEXT_PUBLIC_SITE_URL}/api/webhooks/box-sign`
      : 'http://localhost:3000/api/webhooks/box-sign'

    console.log('🔄 Webhook作成中...')
    console.log('Webhook URL:', webhookUrl)

    const response = await fetch('https://api.box.com/2.0/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: {
          type: 'sign-request'
        },
        address: webhookUrl,
        triggers: [
          'SIGN_REQUEST.COMPLETED',
          'SIGN_REQUEST.DECLINED',
          'SIGN_REQUEST.EXPIRED'
        ]
      })
    })

    const result = await response.json()

    if (response.ok) {
      console.log('\n✅ Webhook作成成功!')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('Webhook ID:', result.id)
      console.log('Webhook URL:', result.address)
      console.log('Triggers:', result.triggers.join(', '))
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('\n📝 次のステップ:')
      console.log('1. Box Developer Consoleを開く: https://app.box.com/developers/console')
      console.log('2. 左メニューから「Webhooks」をクリック')
      console.log('3. 作成されたWebhookをクリック')
      console.log('4. Primary KeyとSecondary Keyをコピー')
      console.log('5. .env.localに以下を追加:')
      console.log('   BOX_WEBHOOK_PRIMARY_KEY=<Primary Key>')
      console.log('   BOX_WEBHOOK_SECONDARY_KEY=<Secondary Key>')
      console.log('6. 開発サーバーを再起動')
      console.log('\n🎉 完了！')
    } else {
      console.error('\n❌ Webhook作成失敗')
      console.error('Status:', response.status, response.statusText)
      console.error('Error:', JSON.stringify(result, null, 2))
    }
  } catch (error) {
    console.error('\n❌ エラー発生:', error.message)
    console.error(error)
  }
}

createWebhook()
