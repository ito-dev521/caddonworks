const fs = require('fs')
const path = require('path')

// .env.localファイルを読み込む
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')

// 環境変数を解析
const envVars = {}
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      envVars[key.trim()] = valueParts.join('=').trim()
    }
  }
})

// Box認証情報を取得
const boxConfig = {
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
}

// Box SDKを使用してトークンを取得
const BoxSDK = require('box-node-sdk')
const sdk = BoxSDK.getPreconfiguredInstance(boxConfig)
const client = sdk.getAppAuthClient('enterprise')

client.getTokensJWTGrant()
  .then(tokenInfo => {
    const accessToken = tokenInfo.accessToken
    console.log(accessToken)
  })
  .catch(error => {
    console.error('エラー:', error.message)
    process.exit(1)
  })
