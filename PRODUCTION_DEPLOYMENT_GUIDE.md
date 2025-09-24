# 本番環境デプロイガイド

## 1. Vercelデプロイ（推奨）

### 初期設定
```bash
# Vercel CLIインストール
npm i -g vercel

# プロジェクトをVercelにデプロイ
vercel

# 本番環境デプロイ
vercel --prod
```

### 独自ドメイン設定
1. Vercelダッシュボード → プロジェクト → Settings → Domains
2. ドメインを追加（例：`caddon.jp`）
3. DNSレコード設定：
   ```
   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   
   Type: A
   Name: @
   Value: 76.76.19.61
   ```

### 環境変数設定
Vercelダッシュボード → Settings → Environment Variables：
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=https://caddon.jp
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain
BOX_CLIENT_ID=your_box_client_id
BOX_CLIENT_SECRET=your_box_client_secret
```

## 2. Netlifyデプロイ

### 設定手順
```bash
# Netlify CLIインストール
npm install -g netlify-cli

# ビルド
npm run build

# デプロイ
netlify deploy --prod --dir=.next
```

### 独自ドメイン設定
1. Netlifyダッシュボード → Site settings → Domain management
2. Custom domain追加
3. DNSレコード設定：
   ```
   Type: CNAME
   Name: www
   Value: your-site.netlify.app
   
   Type: A
   Name: @
   Value: 75.2.60.5
   ```

## 3. AWS（高度な設定）

### 必要なサービス
- **EC2**: サーバーインスタンス
- **RDS**: データベース（PostgreSQL）
- **S3**: ファイルストレージ
- **CloudFront**: CDN
- **Route 53**: DNS管理
- **Certificate Manager**: SSL証明書

### 基本構成
```bash
# EC2インスタンス設定
sudo apt update
sudo apt install nodejs npm nginx

# アプリケーションデプロイ
git clone your-repo
npm install
npm run build
npm start

# Nginx設定
sudo nano /etc/nginx/sites-available/caddon
```

### Nginx設定例
```nginx
server {
    listen 80;
    server_name caddon.jp www.caddon.jp;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 4. Docker + クラウドプロバイダー

### Dockerfile作成
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_KEY}
    restart: unless-stopped
```

## 独自ドメイン設定の共通手順

### 1. ドメイン購入
- **お名前.com**
- **ムームードメイン**
- **AWS Route 53**
- **Cloudflare**

### 2. DNS設定
```
# 基本的なDNSレコード
A     @           xxx.xxx.xxx.xxx  (サーバーIP)
CNAME www         your-domain.com
MX    @           mail.your-domain.com
TXT   @           "v=spf1 include:mailgun.org ~all"
```

### 3. SSL証明書
- **Let's Encrypt**（無料）
- **Cloudflare**（無料）
- **AWS Certificate Manager**（無料）

## 環境変数の本番設定

### 必須環境変数
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# アプリケーション
NEXT_PUBLIC_APP_URL=https://caddon.jp
NODE_ENV=production

# メール（Mailgun）
MAILGUN_API_KEY=key-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
MAILGUN_DOMAIN=mg.caddon.jp

# Box統合
BOX_CLIENT_ID=your_box_client_id
BOX_CLIENT_SECRET=your_box_client_secret
BOX_ENTERPRISE_ID=your_enterprise_id

# 管理者設定
NEXT_PUBLIC_ADMIN_EMAILS=admin@caddon.jp,support@caddon.jp
```

## セキュリティ設定

### 1. HTTPS強制
```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ]
  }
}
```

### 2. 環境変数の保護
- 本番環境では`.env.local`ファイルを使用しない
- クラウドプロバイダーの環境変数機能を使用
- シークレット管理サービスの利用

### 3. データベースセキュリティ
- Supabase RLS（Row Level Security）の有効化
- IP制限の設定
- 定期的なバックアップ

## 監視・ログ設定

### 1. アプリケーション監視
- **Vercel Analytics**
- **Google Analytics**
- **Sentry**（エラー監視）

### 2. パフォーマンス監視
- **Lighthouse CI**
- **Web Vitals**
- **New Relic**

### 3. ログ管理
- **Vercel Functions Logs**
- **CloudWatch**（AWS）
- **Datadog**

## 推奨デプロイフロー

### 1. 開発環境
```bash
git checkout develop
npm run dev
```

### 2. ステージング環境
```bash
git checkout staging
vercel --target staging
```

### 3. 本番環境
```bash
git checkout main
vercel --prod
```

## チェックリスト

### デプロイ前
- [ ] 環境変数の設定確認
- [ ] データベース接続テスト
- [ ] メール送信テスト
- [ ] Box統合テスト
- [ ] セキュリティ設定確認

### デプロイ後
- [ ] 独自ドメインアクセス確認
- [ ] SSL証明書確認
- [ ] 全機能動作テスト
- [ ] パフォーマンステスト
- [ ] SEO設定確認
