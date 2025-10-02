# Box Sign 設定ガイド

## 問題の概要

Box管理画面で以下のエラーが表示される場合の対処法です：

- "You need to be logged in to perform this action"
- "User is missing permissions: sign_and_send"

## 根本原因

BoxアプリケーションでBox Sign APIの権限が有効化されていないことが原因です。

## 解決手順

### 1. Box Developer Console での設定

1. [Box Developer Console](https://app.box.com/developers/console) にアクセス
2. 対象のアプリケーションを選択
3. **Configuration** タブを開く
4. **Application Scopes** セクションで以下を有効化：
   - ✅ **Sign API** (Box Sign機能の基本権限)
   - ✅ **Sign and Send** (署名リクエスト送信権限)
5. **Save Changes** をクリック
6. アプリケーションを再承認（Re-authorize）

### 2. 環境変数の一時的設定

Box Sign権限が有効化されるまでの間、以下の環境変数を設定してBox Sign機能を無効化：

```bash
# .env.local または本番環境の環境変数
BOX_SIGN_ENABLED=false
```

### 3. 権限有効化後の設定

Box Sign権限が正常に設定されたら：

```bash
# Box Sign機能を有効化
BOX_SIGN_ENABLED=true
```

## 確認方法

### 1. Box管理画面での確認
- Box Signセクションにアクセスできるかチェック
- エラーメッセージが消えているかチェック

### 2. アプリケーションでの確認
```bash
# デバッグAPIでBox Sign機能をテスト
curl -X GET http://localhost:3000/api/debug/box-sign/test
```

## トラブルシューティング

### エラーが継続する場合

1. **ブラウザキャッシュクリア**
   - Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)

2. **Box アプリの再承認**
   - Developer Console → Authorization タブ → Re-authorize

3. **権限伝播の待機**
   - 設定変更後、最大30分程度待機が必要な場合があります

### ログの確認

サーバーログで以下のエラーメッセージを確認：
```
Box Sign API Error: 403 - Forbidden
User is missing permissions: sign_and_send
```

## 関連ファイル

- `/src/lib/box-sign.ts` - Box Sign API実装
- `/src/app/api/debug/box-sign/[requestId]/route.ts` - デバッグAPI
- `BOX_SIGN_IMPACT_ANALYSIS.md` - 実装影響分析

## 注意事項

- Box Sign機能は無料プラン（Individual）でも月5ドキュメントまで利用可能です
- 月5ドキュメントを超える場合はBusinessプラン（月額$15～）が必要です
- 権限変更後は必ずアプリケーションの再承認を行ってください
- 本番環境での変更は事前にテスト環境で検証してください