# 注文請書機能ガイド

## 概要

注文請書は、発注書に対する受注者からの受諾文書です。契約が成立した際に、受注者が発注者に対して「この注文を受諾します」という意思表示を行う正式な書類です。

## 機能一覧

### 1. 注文請書の生成
- **エンドポイント**: `POST /api/contracts/[contractId]/order-acceptance`
- **権限**: 受注者のみ
- **用途**: 契約に基づいて注文請書PDFを生成

### 2. 注文請書の情報取得
- **エンドポイント**: `GET /api/contracts/[contractId]/order-acceptance`
- **権限**: 関係者（受注者・発注者）
- **用途**: 注文請書の作成状況を確認

### 3. 注文請書のダウンロード
- **エンドポイント**: `GET /api/contracts/[contractId]/order-acceptance/download`
- **権限**: 関係者（受注者・発注者）
- **用途**: 生成済み注文請書PDFをダウンロード

### 4. 注文請書の電子署名
- **エンドポイント**: `POST /api/contracts/[contractId]/order-acceptance/sign`
- **権限**: 発注者のみ
- **用途**: 注文請書の電子署名リクエストを作成

### 5. 注文請書署名ステータスの取得
- **エンドポイント**: `GET /api/contracts/[contractId]/order-acceptance/sign`
- **権限**: 関係者（受注者・発注者）
- **用途**: 署名ステータスの確認

### 6. 注文請書署名ステータスの更新
- **エンドポイント**: `POST /api/contracts/[contractId]/order-acceptance/sign/status`
- **権限**: システム（Webhook用）
- **用途**: Box Signからの署名完了通知

## 注文請書に含まれる情報

### 必須情報
- **注文書情報**
  - 注文書番号
  - 注文日

- **受注者情報**（請書作成者）
  - 会社名
  - 住所
  - 電話番号
  - メールアドレス

- **発注者情報**
  - 会社名
  - メールアドレス

- **請負内容**
  - 工事名・業務名
  - 請負金額
  - 完成期日
  - 工事場所

- **受諾情報**
  - 受諾日
  - 受諾内容（定型文）

### 署名欄
- 受注者署名欄
- 発注者確認署名欄

## ワークフロー

1. **注文請書の生成**: 発注者が契約金額確定後に注文請書を生成
2. **電子署名の開始**: 発注者が署名リクエストを作成
3. **署名**: 受注者 → 発注者の順で署名
4. **署名完了**: 両者の署名が完了すると注文請書が確定

## API使用例

### 注文請書の生成

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "ORD-2024-001",
    "orderDate": "2024-01-15"
  }' \
  "http://localhost:3000/api/contracts/CONTRACT_ID/order-acceptance"
```

**レスポンス例:**
```json
{
  "message": "注文請書を生成しました",
  "contract": {
    "id": "contract-id",
    "order_acceptance_generated_at": "2024-01-16T10:30:00Z",
    "order_acceptance_box_id": "box-file-id",
    "order_acceptance_number": "ORD-2024-001"
  },
  "fileName": "注文請書_プロジェクト名_受注者名_2024-01-16.pdf",
  "boxFileId": "box-file-id"
}
```

### 注文請書情報の取得

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/contracts/CONTRACT_ID/order-acceptance"
```

**レスポンス例:**
```json
{
  "hasOrderAcceptance": true,
  "orderAcceptanceInfo": {
    "generatedAt": "2024-01-16T10:30:00Z",
    "boxFileId": "box-file-id",
    "orderNumber": "ORD-2024-001",
    "projectTitle": "橋梁設計業務"
  }
}
```

### 注文請書のダウンロード

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o "注文請書.pdf" \
  "http://localhost:3000/api/contracts/CONTRACT_ID/order-acceptance/download"
```

### 注文請書の電子署名

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  "http://localhost:3000/api/contracts/CONTRACT_ID/order-acceptance/sign"
```

**レスポンス例:**
```json
{
  "message": "注文請書の署名リクエストを作成しました",
  "signRequestId": "box-sign-request-id",
  "prepareUrl": "https://app.box.com/sign/prepare/...",
  "signingUrls": [
    {
      "email": "contractor@example.com",
      "url": "https://app.box.com/sign/..."
    },
    {
      "email": "client@example.com",
      "url": "https://app.box.com/sign/..."
    }
  ]
}
```

### 注文請書署名ステータスの確認

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:3000/api/contracts/CONTRACT_ID/order-acceptance/sign"
```

**レスポンス例:**
```json
{
  "hasSignatureRequest": true,
  "signatureInfo": {
    "signRequestId": "box-sign-request-id",
    "startedAt": "2024-01-16T10:30:00Z",
    "completedAt": "2024-01-18T15:20:00Z",
    "projectTitle": "橋梁設計業務",
    "status": {
      "status": "signed",
      "signers": [
        {
          "email": "contractor@example.com",
          "hasSigned": true,
          "signedAt": "2024-01-17T14:30:00Z"
        },
        {
          "email": "client@example.com",
          "hasSigned": true,
          "signedAt": "2024-01-18T15:20:00Z"
        }
      ]
    }
  }
}
```

## データベース更新

注文請書機能を使用する前に、以下のSQLを実行してください：

```sql
-- 基本的な注文請書機能のためのカラム追加
psql -h YOUR_SUPABASE_HOST -d YOUR_DATABASE < supabase/add-order-acceptance-columns.sql

-- 電子署名機能のためのカラム追加
psql -h YOUR_SUPABASE_HOST -d YOUR_DATABASE < supabase/add-order-acceptance-sign-columns.sql
```

## 制限事項

1. **1契約につき1回のみ生成可能**
   - 既に注文請書が生成されている契約では、再生成はできません

2. **発注者のみ生成可能**
   - プロジェクト作成者または組織メンバーのみが注文請書を生成できます

3. **必要な権限**
   - 生成: 発注者（プロジェクト作成者・組織メンバー）
   - 署名開始: 発注者（プロジェクト作成者・組織メンバー）
   - 閲覧・ダウンロード: 受注者または発注者

4. **Box Sign要件**
   - Box Developer ConsoleでSign APIとSign and Send権限が必要
   - 環境変数 `BOX_SIGN_ENABLED=true` が必要

## ファイル管理

- **保存場所**: プロジェクトの「04_契約データ」フォルダ
- **ファイル名形式**: `注文請書_{プロジェクト名}_{受注者名}_{日付}.pdf`
- **Box連携**: 自動的にBoxにアップロードされ、ファイルIDが記録されます

## トラブルシューティング

### エラー: "この契約の注文請書は既に作成されています"
- 1つの契約に対して注文請書は1回のみ生成可能です
- 再生成が必要な場合は、管理者にお問い合わせください

### エラー: "注文請書を作成する権限がありません"
- 契約の受注者のみが注文請書を生成できます
- ログインユーザーが正しい受注者アカウントかご確認ください

### エラー: "注文請書が生成されていません"
- まず注文請書を生成してからダウンロードを行ってください

## 関連ファイル

- **ドキュメント生成**: `/src/lib/document-generator.ts`
- **API実装**: `/src/app/api/contracts/[id]/order-acceptance/`
- **データベース**: `/supabase/add-order-acceptance-columns.sql`