# Box Developer Console 設定チェックリスト

## アクセス方法
https://app.box.com/developers/console

## 確認項目

### 1. アプリケーション基本情報
- [ ] アプリケーション名の確認
- [ ] Client ID: `jac5va3v32chli4biniryhh5hjgeoi85`
- [ ] Enterprise ID: `1344510016`

### 2. Authentication（認証方式）
- [ ] **OAuth 2.0 with JWT (Server Authentication)** が選択されているか確認
- [ ] Public Key ID: `9jn2uecc` が登録されているか確認

### 3. Application Scopes（アプリケーション権限）

#### 必須権限
- [ ] ✅ **Read all files and folders stored in Box**
- [ ] ✅ **Write all files and folders stored in Box**
- [ ] ✅ **Manage users**
- [ ] ✅ **Manage enterprise properties**

#### Box Sign用権限（Businessプラン以上で有効）
- [ ] ✅ **Sign API** (Box Sign機能の基本権限)
- [ ] ✅ **Manage signature requests** (署名リクエスト管理権限)

### 4. Advanced Features
- [ ] ✅ **Perform Actions as Users** (App Auth + As-User header)
- [ ] ✅ **Generate User Access Tokens** (必要に応じて)

### 5. App Authorization（アプリ承認）
- [ ] アプリが **Authorized** 状態か確認
- [ ] 権限変更後は **Re-authorize** ボタンをクリック

### 6. CORS Domains（必要に応じて）
- [ ] 本番環境のドメインを追加（例: `https://yourdomain.com`）
- [ ] 開発環境: `http://localhost:3000`

## Box Signを有効にする手順

### ステップ1: アカウントプランの確認
1. Box管理画面にログイン
2. **Admin Console** → **Account Settings**
3. 現在のプランを確認
   - ❌ 無料プラン → Box Sign利用不可
   - ✅ Business以上 → Box Sign利用可能

### ステップ2: Box Sign権限の有効化
1. Box Developer Console → 対象アプリを選択
2. **Configuration** タブ
3. **Application Scopes** セクション
4. 以下をチェック:
   - ✅ Sign API
   - ✅ Manage signature requests
5. **Save Changes** をクリック
6. **Authorization** タブ → **Re-authorize** をクリック

### ステップ3: 環境変数の更新
```bash
# .env.local
BOX_SIGN_ENABLED=true
```

### ステップ4: 動作確認
```bash
# 開発サーバーを再起動
npm run dev

# Box Sign APIテスト
curl http://localhost:3000/api/debug/box-sign/test
```

## トラブルシューティング

### エラー: "sign_and_send permission required"
**原因**: Box Sign権限が有効化されていない、またはアプリが再承認されていない

**対処法**:
1. Application Scopes で Sign API権限を有効化
2. アプリを再承認（Re-authorize）
3. 最大30分待機（権限伝播に時間がかかる場合あり）

### エラー: "403 Forbidden"
**原因**: アカウントプランがBusinessプラン未満

**対処法**:
1. BoxアカウントをBusinessプラン以上にアップグレード
2. または `BOX_SIGN_ENABLED=false` に設定して機能を無効化

### エラー: "404 Not Found"
**原因**: Box Sign APIエンドポイントが存在しない（アカウント・プラン問題）

**対処法**:
1. Box管理画面でBox Sign機能が有効か確認
2. Admin Console → Box Sign設定を確認

## 参考リンク
- [Box Developer Documentation](https://developer.box.com/)
- [Box Sign API Reference](https://developer.box.com/reference/resources/sign-requests/)
- [Box Pricing](https://www.box.com/pricing)
