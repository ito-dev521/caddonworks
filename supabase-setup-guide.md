# Supabase設定ガイド

## エラー解決手順

### 1. 環境変数の設定

プロジェクトルートに `.env.local` ファイルを作成し、以下の内容を追加してください：

```bash
# Supabase設定
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. Supabaseプロジェクトの設定値を取得

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. プロジェクトを選択
3. Settings > API に移動
4. 以下の値をコピー：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. 環境変数の例

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rxnozwuamddqlcwysxag.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE
```

### 4. 開発サーバーの再起動

環境変数を設定した後、開発サーバーを再起動してください：

```bash
npm run dev
```

### 5. データベーステーブルの作成

環境変数が正しく設定されたら、以下のSQLファイルを実行してください：

```sql
-- 推奨: シンプル再作成アプローチ
\i supabase/recreate-tables-simple.sql
```

### 6. トラブルシューティング

#### エラー: "Failed to fetch (api.supabase.com)"
- 環境変数が正しく設定されているか確認
- Supabaseプロジェクトがアクティブか確認
- ネットワーク接続を確認

#### エラー: "Invalid API key"
- APIキーが正しくコピーされているか確認
- キーに余分なスペースや改行がないか確認

#### エラー: "Project not found"
- Project URLが正しいか確認
- プロジェクトが削除されていないか確認

### 7. 設定確認

以下のコマンドで環境変数が正しく設定されているか確認できます：

```bash
# 開発サーバーを起動してコンソールで確認
npm run dev
```

ブラウザの開発者ツールのコンソールで、Supabaseクライアントが正しく初期化されているか確認してください。
