# BOX統合機能ガイド

## 概要

このアプリケーションはBox APIと統合し、以下の機能を提供します：

- ✅ ファイル・フォルダ管理（無料アカウントでも利用可）
- ✅ コラボレーター管理（無料アカウントでも利用可）
- ⚠️ **Box Sign電子署名**（**Businessプラン以上が必要**）

## 📋 前提条件

### BOX基本機能（ファイル管理）
- Boxアカウント（無料プランでも可）
- JWT認証設定済みのBoxアプリケーション
- 以下の環境変数が設定済み：
  ```bash
  BOX_CLIENT_ID
  BOX_CLIENT_SECRET
  BOX_ENTERPRISE_ID
  BOX_JWT_PRIVATE_KEY
  BOX_JWT_PRIVATE_KEY_PASSPHRASE
  BOX_PUBLIC_KEY_ID
  BOX_PROJECTS_ROOT_FOLDER_ID
  ```

### Box Sign電子署名機能（⚠️有料機能）
- ✅ **Boxプラン**: Business以上（月額$15～）が**必須**
- ✅ Box Developer Consoleで以下の権限を有効化：
  - Sign API
  - Manage signature requests
- ✅ 環境変数: `BOX_SIGN_ENABLED=true`

## 🚀 セットアップ手順

### 1. Box Developer Consoleの設定

1. [Box Developer Console](https://app.box.com/developers/console) にアクセス
2. 新しいアプリを作成または既存アプリを選択
3. **Authentication**: OAuth 2.0 with JWT を選択
4. **Application Scopes**:
   - ✅ Read all files and folders
   - ✅ Write all files and folders
   - ✅ Manage users
   - ✅ Manage enterprise properties
   - ✅ Sign API（Businessプラン以上）
   - ✅ Manage signature requests（Businessプラン以上）
5. Public/Private Keypairを生成
6. アプリを承認（Authorize）

### 2. 環境変数の設定

`.env.local` ファイルに以下を追加：

```bash
# Box基本設定
BOX_CLIENT_ID=your_client_id
BOX_CLIENT_SECRET=your_client_secret
BOX_ENTERPRISE_ID=your_enterprise_id
BOX_JWT_PRIVATE_KEY='-----BEGIN ENCRYPTED PRIVATE KEY-----\n...\n-----END ENCRYPTED PRIVATE KEY-----\n'
BOX_JWT_PRIVATE_KEY_PASSPHRASE=your_passphrase
BOX_PUBLIC_KEY_ID=your_public_key_id
BOX_PROJECTS_ROOT_FOLDER_ID=your_root_folder_id

# Box Sign機能制御（Businessプラン以上で true、無料プランは false）
BOX_SIGN_ENABLED=false
```

### 3. 動作確認

```bash
# 開発サーバー起動
npm run dev

# Box API接続テスト
curl http://localhost:3000/api/test-box
```

## 💰 料金プランと機能対応表

| 機能 | 無料プラン | Businessプラン | Enterprise Plusプラン |
|------|-----------|---------------|---------------------|
| ファイル管理 | ✅ | ✅ | ✅ |
| フォルダ管理 | ✅ | ✅ | ✅ |
| コラボレーター | ✅ | ✅ | ✅ |
| **Box Sign** | ❌ | ✅ | ✅ |
| サードパーティ署名統合 | ❌ | ❌ | ✅ |
| 月額料金 | $0 | $15～/ユーザー | $35～/ユーザー |

**重要**: Box Signを使用するには、Boxアカウントを**Businessプラン以上**にアップグレードする必要があります。

## 🔧 Box Sign機能の有効化

### アカウントプランがBusinessプラン以上の場合

1. **Box Developer Consoleで権限を有効化**:
   ```
   Configuration → Application Scopes
   ✅ Sign API
   ✅ Manage signature requests
   → Save Changes
   → Authorization → Re-authorize
   ```

2. **環境変数を更新**:
   ```bash
   BOX_SIGN_ENABLED=true
   ```

3. **開発サーバーを再起動**:
   ```bash
   npm run dev
   ```

### 無料アカウント、または署名機能不要の場合

```bash
# Box Sign機能を無効化
BOX_SIGN_ENABLED=false
```

## 📝 実装されている機能

### ✅ Box基本API（全プランで利用可能）

**ファイル操作**:
- ファイルアップロード（`uploadFileToBox`）
- ファイルダウンロード（`downloadBoxFile`）
- ファイル情報取得（`getBoxFileInfo`）
- バージョン管理（同名ファイルの新バージョンアップロード）

**フォルダ操作**:
- フォルダ作成（`ensureProjectFolder`）
- フォルダ構造作成（`createProjectFolderStructure`）
- フォルダアイテム一覧（`getBoxFolderItems`）
- フォルダリネーム（`renameBoxFolder`）
- フォルダ削除（`deleteBoxFolder`）

**コラボレーション**:
- コラボレーター追加（`addBoxCollaborator`）
- コラボレーター削除（`removeBoxCollaborator`）
- コラボレーター一覧取得（`getBoxFolderCollaborators`）

### ⚠️ Box Sign API（Businessプラン以上で利用可能）

**署名リクエスト**:
- 署名リクエスト作成（`boxSignAPI.createSignatureRequest`）
- 署名ステータス取得（`boxSignAPI.getSignatureStatus`）
- 署名リクエストキャンセル（`boxSignAPI.cancelSignatureRequest`）
- 署名リクエスト再送信（`boxSignAPI.resendSignatureRequest`）
- 署名済みドキュメントダウンロード（`boxSignAPI.downloadSignedDocument`）

**使用例**:
```typescript
import { boxSignAPI, SignerInfo } from '@/lib/box-sign'

const signers: SignerInfo[] = [
  { email: 'contractor@example.com', role: 'contractor', order: 1 },
  { email: 'client@example.com', role: 'client', order: 2 }
]

const result = await boxSignAPI.createSignatureRequest({
  documentName: '契約書',
  boxFileId: 'file_id_here',
  signers,
  daysUntilExpiration: 30
})
```

## 🔍 トラブルシューティング

### エラー: "Box Sign機能は現在メンテナンス中です"

**原因**: `BOX_SIGN_ENABLED` が未設定、または署名権限が無効

**対処法**:
1. Boxアカウントプランを確認（Business以上が必要）
2. 無料プランの場合: `BOX_SIGN_ENABLED=false` に設定
3. Businessプラン以上の場合: Developer Consoleで署名権限を有効化

### エラー: "sign_and_send permission required"

**原因**: Box Developer Consoleで署名権限が有効化されていない

**対処法**:
1. [Box Developer Console](https://app.box.com/developers/console) にアクセス
2. Configuration → Application Scopes
3. ✅ Sign API と Manage signature requests を有効化
4. Save Changes → Authorization → Re-authorize
5. 最大30分待機（権限伝播に時間がかかる場合あり）

### エラー: "403 Forbidden"

**原因**: アカウントプランが不足、またはアプリ承認が必要

**対処法**:
1. Boxアカウントプランを確認
2. Box Developer Consoleでアプリを再承認
3. 権限設定を再確認

## 📚 参考リンク

- [Box Developer Documentation](https://developer.box.com/)
- [Box Sign API Reference](https://developer.box.com/reference/resources/sign-requests/)
- [Box Pricing](https://www.box.com/pricing)
- [Box Developer Console チェックリスト](./BOX_DEVELOPER_CONSOLE_CHECKLIST.md)
- [Box Sign セットアップガイド](./BOX_SIGN_SETUP_GUIDE.md)

## ⚙️ 関連ファイル

- `/src/lib/box.ts` - Box基本API実装
- `/src/lib/box-sign.ts` - Box Sign API実装
- `/src/app/api/test-box/route.ts` - Box接続テストAPI
- `/.env.local` - 環境変数設定
- `/.env.example` - 環境変数テンプレート

## ❓ よくある質問

**Q: 無料アカウントでBox Signは使えますか？**
A: いいえ、Box Signは**Businessプラン以上**（月額$15～）が必要です。無料プランでは使用できません。

**Q: 署名者もBoxアカウントが必要ですか？**
A: いいえ、署名者はBoxアカウント不要で署名できます。

**Q: Box Sign機能を無効にするとどうなりますか？**
A: 署名関連のAPIは503エラーを返し、ファイル管理などの基本機能は引き続き利用できます。

**Q: Businessプランにアップグレードせずに電子署名を実装できますか？**
A: Box Sign以外の電子署名サービス（DocuSign、Adobe Sign等）との統合を検討してください。
