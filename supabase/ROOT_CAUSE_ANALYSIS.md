# 請求書計算エラーの根本原因分析

## 問題の概要

複数の受注者請求書データで、サポート料・小計・源泉税の計算が間違っていた。

## 発見された具体的な問題

1. **INV-E9331B33 (縦断図作成)**
   - 誤: サポート料 -¥1,843 (15.36%)、小計 ¥10,157
   - 正: サポート料 -¥960 (8%)、小計 ¥11,040

2. **INV-A0D5CA6B (ブロック積み展開図作成)**
   - 誤: 小計 ¥115,000 (契約金額¥20,000より大きい!)
   - 正: サポート料 -¥1,600、小計 ¥18,400

3. **河川横断図作成**
   - 誤: サポート料 ¥2,042
   - 正: サポート料 ¥1,600 (¥20,000 × 8%)

## 根本原因

### 1. APIレベルでのデータ保存エラー

**ファイル**: `src/app/api/contractor-invoices/route.ts`
**行番号**: 146

```typescript
// 間違ったコード（修正前）
const invoiceData: any = {
  base_amount: totalSubtotal,  // ← 小計を契約金額として保存！
  fee_amount: totalSupportFee,
  system_fee: totalWithholding,
  total_amount: totalFinalAmount, // ← 最終金額を小計として保存！
  // ...
}

// 正しいコード（修正後）
const invoiceData: any = {
  base_amount: totalContractAmount,  // ← 契約金額
  fee_amount: totalSupportFee,
  system_fee: totalWithholding,
  total_amount: totalSubtotal,       // ← 小計（サポート料引いた後）
  // ...
}
```

**問題点**:
- `base_amount` に `totalSubtotal` を保存していた → 契約金額ではなく小計が保存される
- `total_amount` に `totalFinalAmount` を保存していた → 小計ではなく最終金額が保存される
- この結果、DBに保存された時点で既に間違った値が入る

### 2. フィールド名の混乱

データベーススキーマとAPI変数名の対応が不明瞭だった：

| DBフィールド | 本来の意味 | 間違って保存された値 |
|------------|----------|------------------|
| `base_amount` | 契約金額 | 小計（サポート料引き後） |
| `total_amount` | 小計（サポート料引き後） | 最終金額（源泉税も引き後） |
| `system_fee` | 源泉税 | （これは正しい） |
| `fee_amount` | サポート料 | （これは正しい） |

### 3. 一括修正でも修正されなかった理由

`fix-all-invoices-keyvalue.sql` を実行しても一部の請求書が修正されなかった理由：

**可能性1**: `contract_id` が NULL または無効
```sql
WHERE i.contract_id = c.id  -- contract_idがNULLなら JOIN失敗
  AND i.direction = 'to_operator'
```

**可能性2**: `support_enabled` が NULL
```sql
CASE
  WHEN c.support_enabled THEN ...  -- NULLはFALSEとして扱われる
  ELSE ...
END
```

**可能性3**: データ整合性の問題
- プロジェクトが削除されている
- 契約が削除されている
- 外部キー制約がない場合、孤立した請求書が存在する

## なぜこのバグが発生したか

### 開発時の問題

1. **変数名の不明瞭さ**
   - `totalSubtotal` と `totalContractAmount` の違いが分かりにくい
   - `total_amount` というフィールド名が「合計金額」を連想させ、最終金額と混同

2. **テストの不足**
   - 請求書作成APIのユニットテスト不足
   - 保存された値の検証テスト不足
   - 計算ロジックの統合テスト不足

3. **データ検証の欠如**
   - API側でのバリデーションがない
   - DB側でのCHECK制約がない
   - 例: `total_amount <= base_amount` のようなチェックがない

4. **計算ロジックの分散**
   - フロントエンドで計算
   - バックエンドAPIで計算
   - SQL側でも計算
   - → 一貫性が保証されていない

## 今後の再発防止策

### 1. データベースレベル（即座に実施）

```sql
-- CHECK制約を追加
ALTER TABLE public.invoices
ADD CONSTRAINT check_base_amount_positive CHECK (base_amount > 0),
ADD CONSTRAINT check_total_amount_valid CHECK (
  (direction = 'to_operator' AND total_amount <= base_amount)
  OR (direction != 'to_operator')
),
ADD CONSTRAINT check_fee_amount_valid CHECK (
  fee_amount >= 0 AND fee_amount <= base_amount
);
```

### 2. APIレベル（即座に実施）

**ファイル**: `src/app/api/contractor-invoices/route.ts`

```typescript
// データ保存前にバリデーション
function validateInvoiceData(data: InvoiceData, contracts: Contract[]): void {
  const totalContractAmount = contracts.reduce((sum, c) => sum + c.bid_amount, 0)

  // 契約金額チェック
  if (data.base_amount !== totalContractAmount) {
    throw new Error('base_amount must equal total contract amount')
  }

  // サポート料チェック
  if (data.fee_amount < 0 || data.fee_amount > data.base_amount) {
    throw new Error('Invalid fee_amount')
  }

  // 小計チェック
  if (data.total_amount !== data.base_amount - data.fee_amount) {
    throw new Error('total_amount must equal base_amount - fee_amount')
  }

  // 源泉税チェック
  const expectedWithholding = calculateWithholding(data.total_amount)
  if (data.system_fee !== expectedWithholding) {
    throw new Error(`Invalid system_fee: expected ${expectedWithholding}, got ${data.system_fee}`)
  }
}
```

### 3. 計算ロジックの一元化（中期対応）

```typescript
// src/lib/invoice-calculations.ts を作成
export function calculateInvoiceAmounts(
  contractAmount: number,
  supportFeePercent: number,
  supportEnabled: boolean
): {
  base_amount: number
  fee_amount: number
  total_amount: number
  system_fee: number
} {
  const base_amount = contractAmount
  const fee_amount = supportEnabled ? Math.round(base_amount * supportFeePercent / 100) : 0
  const total_amount = base_amount - fee_amount
  const system_fee = calculateWithholding(total_amount)

  return { base_amount, fee_amount, total_amount, system_fee }
}
```

### 4. 自動テストの追加（中期対応）

```typescript
// tests/invoice-calculations.test.ts
describe('Invoice Calculations', () => {
  it('should calculate support fee correctly', () => {
    const result = calculateInvoiceAmounts(20000, 8, true)
    expect(result.fee_amount).toBe(1600)
    expect(result.total_amount).toBe(18400)
  })

  it('should calculate withholding tax correctly', () => {
    const result = calculateInvoiceAmounts(1200000, 8, true)
    const expected = calculateWithholding(result.total_amount)
    expect(result.system_fee).toBe(expected)
  })
})
```

### 5. データ整合性の定期チェック（長期対応）

```typescript
// src/app/api/admin/verify-invoices/route.ts
// 管理者が定期的にデータ整合性をチェックできるAPIを作成
```

## まとめ

**根本原因**: APIで間違ったフィールドに間違った値を保存していた（base_amountに小計、total_amountに最終金額）

**影響範囲**: 恐らく全ての請求書（または特定時期以降の全請求書）

**修正方針**:
1. 即座: 全請求書データをSQLで一括修正
2. 即座: API修正（既に完了）
3. 即座: DB制約追加
4. 中期: バリデーション・テスト追加
5. 長期: データ監視機能追加
