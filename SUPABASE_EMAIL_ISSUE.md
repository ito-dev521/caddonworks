# Supabaseメール認証問題の調査結果

## 問題の症状
- 受注者登録時にSupabaseから認証メールが送信されない
- 全てのメールアドレスが "Email address is invalid" エラーになる

## 調査結果

### 1. 環境変数の確認
✅ **正常**: 環境変数は正しく設定されている
- NEXT_PUBLIC_SUPABASE_URL: https://rxnozwuamddqlcwysxag.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY: 設定済み
- SUPABASE_SERVICE_ROLE_KEY: 設定済み

### 2. APIテスト結果
❌ **問題**: 全てのメールアドレスが無効と判定される
- test@gmail.com → "Email address is invalid"
- test.email.verification@gmail.com → "Email address is invalid"

## 考えられる原因

### 1. Supabaseプロジェクトの設定問題
- **メール認証設定が無効**: Supabaseダッシュボードでメール認証が無効になっている可能性
- **SMTPプロバイダー未設定**: カスタムSMTPが設定されていない
- **メールテンプレート問題**: メールテンプレートが正しく設定されていない

### 2. Supabaseプロジェクトの状態
- **プロジェクト一時停止**: 無料プランの制限に達している可能性
- **API制限**: レート制限に達している可能性

## 解決手順

### 1. Supabaseダッシュボードでの確認事項
1. **Authentication > Settings**:
   - "Enable email confirmations" がONになっているか
   - "Secure email change" の設定
   - "Double confirm email changes" の設定

2. **Authentication > Email Templates**:
   - "Confirm signup" テンプレートが設定されているか
   - リダイレクトURLが正しく設定されているか

3. **Authentication > Providers**:
   - Email provider が有効になっているか

4. **Settings > API**:
   - プロジェクトが正常に動作しているか
   - 使用量制限に達していないか

### 2. 代替解決策
1. **新しいSupabaseプロジェクトの作成**
2. **カスタムSMTPプロバイダーの設定** (SendGrid, Mailgun等)
3. **メール認証の一時的な無効化** (開発環境のみ)

## 推奨アクション
1. Supabaseダッシュボードでメール設定を確認
2. 必要に応じてSMTPプロバイダーを設定
3. テスト用の一時的な回避策を実装
