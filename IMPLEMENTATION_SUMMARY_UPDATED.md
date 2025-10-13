# Box Sign 署名済みドキュメント保存先の最適化 - 実装完了

## 質問と答え

**質問:** BOXsignはMy Signed Documentsフォルダに絶対作成しないといけない仕様ですか？直接各プロジェクトの04_契約資料で生成することはダメなの？

**答え:** いいえ、Box Sign APIでは `parent_folder` パラメータを使用することで、署名済みドキュメントの保存先を自由に指定できます！

## Box Sign APIの仕様

### parent_folder パラメータ

Box Sign署名リクエスト作成時に `parent_folder` を指定することで、署名済みドキュメントの保存先フォルダを指定できます。

```typescript
{
  source_files: [{ type: 'file', id: 'fileId' }],
  parent_folder: {           // ← ここで保存先を指定
    type: 'folder',
    id: 'folderId'          // 任意のフォルダID
  },
  signers: [...],
  // ...
}
```

### デフォルト動作

`parent_folder` を指定しない場合：
1. 元のファイルの親フォルダ（権限がある場合）
2. または「My Sign Requests」フォルダ

に保存されます。

### 制限事項

- ルートフォルダ（folder ID 0）は使用不可
- 署名済みドキュメントは自動的にPDF形式になる

## 実装内容

### 1. Box Sign APIラッパーの修正

**ファイル:** `/src/lib/box-sign.ts`

**変更点:**
1. `SignatureRequestOptions` インターフェースに `parentFolderId?: string` を追加
2. `createSignatureRequest` メソッドで `parentFolderId` が指定されている場合はそれを使用

```typescript
export interface SignatureRequestOptions {
  // ...既存のプロパティ
  parentFolderId?: string // 署名済みドキュメントの保存先フォルダID
}

async createSignatureRequest(options: SignatureRequestOptions) {
  // 親フォルダIDを決定（指定がある場合はそれを使用、なければデフォルト）
  const parentFolderId = options.parentFolderId || await this.ensureSignFolder()

  const signRequestData = {
    // ...
    parent_folder: {
      type: 'folder',
      id: parentFolderId  // ← カスタムフォルダIDまたはデフォルト
    },
    // ...
  }
}
```

### 2. 注文請書署名リクエストAPIの修正

**ファイル:** `/src/app/api/contracts/[id]/order-acceptance/sign/route.ts`

**変更点:**
1. `getAppAuthAccessToken` をインポート
2. 契約情報取得時に `box_folder_id` も取得
3. プロジェクトの「04_契約資料」フォルダを検索
4. 見つかったフォルダIDを `parentFolderId` として渡す

```typescript
// プロジェクトの04_契約資料フォルダを取得
let contractFolderId: string | undefined = undefined

if (project.box_folder_id) {
  const accessToken = await getAppAuthAccessToken()
  const response = await fetch(
    `https://api.box.com/2.0/folders/${project.box_folder_id}/items?limit=100`,
    { headers: { 'Authorization': `Bearer ${accessToken}` } }
  )

  if (response.ok) {
    const items = await response.json()
    const contractFolder = items.entries?.find((item: any) =>
      item.type === 'folder' &&
      (item.name.includes('04_契約') || item.name.includes('契約'))
    )

    if (contractFolder) {
      contractFolderId = contractFolder.id
    }
  }
}

// Box Sign署名リクエストを作成
const signatureRequest = await boxSignAPI.createSignatureRequest({
  // ...既存のオプション
  parentFolderId: contractFolderId  // ← 04_契約資料フォルダを指定
})
```

### 3. 署名完了確認APIの簡素化

**ファイル:** `/src/app/api/contracts/[id]/order-acceptance/sign/check/route.ts`

**変更点:**
- ファイルコピー処理を削除（不要になったため）
- 署名ステータス確認とデータベース更新のみを実施

```typescript
// 署名済みファイルIDを取得（参照のみ）
const signedFileId = signatureStatus.signFiles?.files?.[0]?.id

// データベースを更新
await supabaseAdmin
  .from('contracts')
  .update({
    order_acceptance_signed_at: signedAt,
    order_acceptance_signed_box_id: signedFileId || null
  })
  .eq('id', contractId)
```

### 4. フロントエンドUIメッセージの修正

**ファイル:** `/src/app/contracts/[id]/page.tsx`

**変更点:**
- メッセージを「コピーしました」から「保存されています」に変更

```typescript
alert(`署名が完了しました！\n\n署名済みドキュメントはプロジェクトの「04_契約資料」フォルダに保存されています。\n\n署名完了日時: ${new Date(result.signedAt).toLocaleString('ja-JP')}`)
```

## メリット

### 1. シンプルな実装
- ファイルコピー処理が不要
- APIコール回数が削減
- エラーハンドリングがシンプル

### 2. ユーザー体験の向上
- 署名完了時、ドキュメントが自動的に正しい場所に配置される
- 「My Signed Documents」から手動で移動する必要がない
- プロジェクトメンバーがすぐにアクセス可能

### 3. パフォーマンス向上
- ファイルコピー操作が不要（Box内部で直接保存）
- ネットワーク通信が削減

### 4. 一貫性の確保
- すべての署名済みドキュメントが一貫して正しい場所に保存される
- フォルダ構造が整理される

## ワークフロー

### 署名リクエスト作成時

```
1. 発注者が「署名を依頼」ボタンをクリック
   ↓
2. API: プロジェクトの「04_契約資料」フォルダを検索
   ↓
3. API: Box Sign署名リクエストを作成
   - source_files: 注文請書PDFのファイルID
   - parent_folder: 「04_契約資料」フォルダID  ← 重要！
   - signers: 受注者情報
   ↓
4. 受注者にメール通知が送信される
```

### 署名完了時

```
1. 受注者がメールから署名リンクをクリック
   ↓
2. Box Signで署名を完了
   ↓
3. Box Sign: 署名済みドキュメントを「04_契約資料」フォルダに自動保存  ← 自動！
   ↓
4. 発注者が「署名完了を確認」ボタンをクリック
   ↓
5. API: Box Sign APIで署名ステータスを確認
   ↓
6. API: データベースを更新（署名完了日時と署名済みファイルID）
   ↓
7. API: 受注者に通知を送信
   ↓
8. UI: 契約情報が更新され、署名完了状態が表示される
```

## データベースマイグレーション

引き続き必要です（署名済みファイルIDを記録するため）：

```bash
# /supabase/add-order-acceptance-signed-box-id.sql を実行
```

```sql
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_signed_box_id VARCHAR;

CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_signed_box_id
    ON contracts(order_acceptance_signed_box_id);

COMMENT ON COLUMN contracts.order_acceptance_signed_box_id
    IS '署名済み注文請書のBoxファイルID（04_契約資料フォルダに直接保存されたファイル）';
```

## テスト方法

1. 発注者として契約詳細ページを開く
2. 「署名を依頼」ボタンをクリック
3. 受注者としてメールから署名を完了
4. **Boxで「04_契約資料」フォルダを確認** ← 重要！
5. 署名済みドキュメントが既にそこに保存されていることを確認
6. 発注者として「署名完了を確認」ボタンをクリック
7. 成功メッセージが表示されることを確認
8. 契約情報が更新されることを確認

## 重要なポイント

### ✅ 正しいアプローチ
- Box Sign署名リクエスト作成時に `parent_folder` を指定
- 署名済みドキュメントが最初から正しい場所に保存される
- シンプルで効率的

### ❌ 以前のアプローチ（不要になった）
- ~~「My Signed Documents」から署名済みドキュメントをコピー~~
- ~~追加のAPI呼び出しとエラーハンドリング~~
- ~~手動でファイルを移動~~

## まとめ

Box Sign APIの `parent_folder` パラメータを活用することで：

- **署名済みドキュメントを直接プロジェクトの「04_契約資料」フォルダに保存できる**
- ファイルコピー処理が不要になり、実装がシンプルになる
- ユーザー体験が向上する
- システムのパフォーマンスが改善される

この実装により、注文請書の署名ワークフローが大幅に最適化されました。
