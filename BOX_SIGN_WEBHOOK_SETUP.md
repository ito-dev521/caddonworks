# Box Sign Webhook 設定手順

## 概要

Box Sign Webhookを設定することで、受注者が注文請書に署名した瞬間に自動的に：
- 署名完了を検知
- データベースを更新
- プロジェクトステータスを「進行中」に変更
- チャットルームを作成
- 関係者全員に通知を送信

**発注者が手動で「署名完了を確認」ボタンをクリックする必要がなくなります！**

## 実装済みの機能

✅ Webhook APIエンドポイント: `/api/webhooks/box-sign`
✅ 署名検証機能
✅ 自動署名完了処理
✅ 通知送信（受注者、発注者、承認者）

## 設定手順

### 1. 環境変数の設定

`.env.local` に以下を追加：

```bash
# Box Webhook署名検証キー
BOX_WEBHOOK_PRIMARY_KEY=your_primary_key_here
BOX_WEBHOOK_SECONDARY_KEY=your_secondary_key_here

# サイトURL（本番環境）
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
```

### 2. Box Developer Consoleでの設定（アプリケーションスコープ）

#### ⚠️ 重要: Box Sign WebhookはAPIで作成します

Box Developer ConsoleのUIでは、Box Sign Webhook（V2）を作成することが**できません**。

理由：
- UIで表示されるコンテンツタイプはファイル/フォルダのみ
- Box Sign専用のWebhookはAPIで作成する必要があります

#### Step 1: アプリケーションスコープの設定

まず、アプリケーションに「Webhookを管理する」スコープを追加します：

1. https://app.box.com/developers/console にアクセス
2. 使用中のアプリケーションを選択
3. 左メニューから「Configuration」（設定）を選択
4. 「Application Scopes」セクションまでスクロール
5. ✅ **「Manage webhooks」（Webhookを管理する）** をチェック
6. 画面右上の「Save Changes」をクリック
7. **「Reauthorize Application」** ボタンが表示されたらクリック（再承認）

⚠️ **重要**: アプリケーションを再承認しないと、Webhookは作成できません。

### 3. APIでWebhookを作成（推奨方法）

Box Sign WebhookはAPIで作成する必要があります。以下の手順に従ってください：

#### Step 1: 管理者としてログイン

ブラウザで本番環境（またはローカル環境）にアクセスし、管理者アカウントでログインしてください。

#### Step 2: ブラウザの開発者ツールでWebhookを作成

1. ブラウザで本番環境にアクセスし、管理者としてログイン
2. ブラウザの開発者ツールを開く（F12キー）
3. 「Console」タブを選択
4. 以下のコードを貼り付けて実行：

```javascript
// Supabase Clientをインポート（既にページで読み込まれている場合）
// なければ、Application -> Local Storage -> supabase.auth.token から
// access_token を手動でコピーして使用

// 方法1: Supabaseが利用可能な場合
const getTokenAndCreateWebhook = async () => {
  try {
    // 認証トークンを取得（LocalStorageから取得）
    const authData = localStorage.getItem('sb-YOUR_PROJECT_REF-auth-token')
    if (!authData) {
      console.error('認証情報が見つかりません。ログインしてください。')
      return
    }

    const { access_token } = JSON.parse(authData)

    // Webhookを作成
    const response = await fetch('/api/webhooks/box-sign/setup', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        webhookUrl: window.location.origin + '/api/webhooks/box-sign',
        triggers: [
          'SIGN_REQUEST.COMPLETED',
          'SIGN_REQUEST.DECLINED',
          'SIGN_REQUEST.EXPIRED'
        ]
      })
    })

    const result = await response.json()
    console.log('✅ Webhook作成結果:', result)

    if (response.ok) {
      alert('Webhookの作成に成功しました！\nBox Developer Consoleで署名検証キーを確認してください。')
    } else {
      alert('エラー: ' + result.message)
    }
  } catch (error) {
    console.error('❌ エラー:', error)
    alert('エラーが発生しました: ' + error.message)
  }
}

// 実行
getTokenAndCreateWebhook()
```

**ヒント**: `YOUR_PROJECT_REF` はSupabaseプロジェクトの参照IDです。

**簡単な方法**:
1. Application タブ → Local Storage → あなたのドメイン
2. `sb-xxxxx-auth-token` を探す
3. `access_token` の値をコピー
4. 以下のシンプルなコードを使用：

```javascript
const token = 'YOUR_ACCESS_TOKEN_HERE'

fetch('/api/webhooks/box-sign/setup', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    webhookUrl: window.location.origin + '/api/webhooks/box-sign',
    triggers: [
      'SIGN_REQUEST.COMPLETED',
      'SIGN_REQUEST.DECLINED',
      'SIGN_REQUEST.EXPIRED'
    ]
  })
})
.then(r => r.json())
.then(result => console.log('✅ 結果:', result))
.catch(err => console.error('❌ エラー:', err))
```

#### Step 3: 署名検証キーを取得

Webhookを作成すると、Boxが自動的に署名検証キー（Primary KeyとSecondary Key）を生成します。

しかし、**APIレスポンスにはキーが含まれていません**。キーを取得するには：

1. Box Developer Consoleにアクセス
2. 左メニューから「Webhooks」を選択
3. 作成されたWebhookをクリック
4. 「Primary Key」と「Secondary Key」をコピー
5. `.env.local` に貼り付け：

```bash
BOX_WEBHOOK_PRIMARY_KEY=your_primary_key_here
BOX_WEBHOOK_SECONDARY_KEY=your_secondary_key_here
```

#### Step 4: サーバーを再起動

環境変数を更新したら、サーバーを再起動してください：

```bash
# 開発環境
npm run dev

# 本番環境（Vercel等）
環境変数を更新してデプロイ
```

**✅ 完了！** これで署名完了時に自動的に通知が送信されるようになります。

### Alternative: curlコマンドでWebhookを作成

ターミナルから直接Webhookを作成することもできます：

```bash
# まず、認証トークンを取得（ブラウザの開発者ツールから）
# supabase.auth.getSession() で取得できます

curl -X POST https://yourdomain.com/api/webhooks/box-sign/setup \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "webhookUrl": "https://yourdomain.com/api/webhooks/box-sign",
    "triggers": [
      "SIGN_REQUEST.COMPLETED",
      "SIGN_REQUEST.DECLINED",
      "SIGN_REQUEST.EXPIRED"
    ]
  }'
```

### Webhook管理API

作成したWebhookを管理するためのAPIエンドポイント：

**Webhook一覧を取得:**
```bash
GET /api/webhooks/box-sign/setup
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Webhookを削除:**
```bash
DELETE /api/webhooks/box-sign/setup?id=WEBHOOK_ID
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### 4. テスト方法

#### ローカル環境でのテスト

ローカル環境では、ngrokなどのトンネリングサービスを使用：

```bash
# ngrokをインストール
npm install -g ngrok

# ngrokを起動
ngrok http 3000

# 表示されたURLをBox WebhookのURLに設定
# 例: https://abc123.ngrok.io/api/webhooks/box-sign
```

#### テスト手順

1. 注文請書署名リクエストを送信
2. 受注者として署名を完了
3. サーバーログを確認：

```bash
📨 Box Webhook受信: { trigger: 'SIGN_REQUEST.COMPLETED', source: { id: '...' } }
✅ 署名完了イベント: <sign_request_id>
🔄 署名完了処理を開始: <contract_id>
✅ 署名完了処理成功
```

4. 通知が全員に届くことを確認

## Webhookのワークフロー

```
1. 受注者がBox Signで署名を完了
   ↓
2. Box Sign → Webhook API (/api/webhooks/box-sign)
   📨 SIGN_REQUEST.COMPLETED イベント
   ↓
3. Webhook API → 署名完了確認API (/api/contracts/[id]/order-acceptance/sign/check)
   ↓
4. 自動処理:
   - ✅ 署名ステータス確認
   - ✅ データベース更新
   - ✅ プロジェクトステータス更新
   - ✅ チャットルーム作成
   - ✅ 通知送信（受注者、発注者、承認者）
   ↓
5. 全員に通知が届く！
```

## セキュリティ

### Webhook署名検証

Webhookリクエストの署名を検証して、正当なBoxからのリクエストであることを確認：

```typescript
function verifyWebhookSignature(
  body: string,
  signature: string | null,
  primaryKey: string,
  secondaryKey?: string
): boolean {
  const hmac = crypto.createHmac('sha256', primaryKey)
  hmac.update(body)
  const calculatedSignature = hmac.digest('base64')
  return signature === calculatedSignature
}
```

### 環境変数の保護

- `BOX_WEBHOOK_PRIMARY_KEY` と `BOX_WEBHOOK_SECONDARY_KEY` は絶対に公開しない
- `.env.local` は `.gitignore` に含める
- 本番環境では環境変数を安全に管理

## トラブルシューティング

### Webhookが届かない

**確認事項:**
1. Box Developer ConsoleでWebhookが正しく設定されているか
2. Webhook URLが正しいか（httpsが必要）
3. サーバーがWebhookリクエストを受信できるか（ファイアウォール設定）
4. 署名検証キーが正しいか

**ログ確認:**
```bash
# サーバーログを確認
tail -f logs/app.log | grep "Box Webhook"
```

### 署名検証エラー

```
❌ Box Webhook署名検証失敗
```

**解決方法:**
1. `.env.local` のキーが正しいか確認
2. Box Developer Consoleのキーと一致するか確認
3. キーをコピペする際に余分なスペースがないか確認

### 契約が見つからない

```
❌ 契約が見つかりません: <sign_request_id>
```

**解決方法:**
1. `order_acceptance_sign_request_id` がデータベースに正しく保存されているか確認
2. 署名リクエスト作成時のログを確認

## 手動確認ボタンとの共存

Webhookを設定しても、手動の「署名完了を確認」ボタンは残ります：

- **Webhook設定済み**: 自動的に処理される（ボタンは不要）
- **Webhook未設定**: 手動でボタンをクリック

どちらの方法でも、重複処理は防止されます：

```typescript
// 既に署名完了処理済みの場合はスキップ
if (contract.order_acceptance_signed_at) {
  console.log('ℹ️ 既に署名完了処理済み')
  return NextResponse.json({ message: 'Already processed' }, { status: 200 })
}
```

## メリット

### Webhookあり（自動）
- ✅ リアルタイムで署名完了を検知
- ✅ 手動操作不要
- ✅ 即座に通知が届く
- ✅ ユーザー体験が向上

### Webhookなし（手動）
- 発注者が「署名完了を確認」ボタンをクリック
- クリックするまで通知が届かない
- 確認漏れの可能性

## まとめ

Box Sign Webhookを設定することで、署名完了の自動検知と通知が実現できます。

設定は簡単で、5分程度で完了します。

**推奨**: 本番環境では必ずWebhookを設定してください！
