# 請求書計算エラーの修正と再発防止策 - 実装サマリー

## 完了した作業

### 1. 根本原因の分析 ✓

**ファイル**: `supabase/ROOT_CAUSE_ANALYSIS.md`

主な原因:
- APIが間違ったフィールドに間違った値を保存していた
- `base_amount` に小計を保存（契約金額であるべき）
- `total_amount` に最終金額を保存（小計であるべき）
- システム設定の取得方法が間違っていた（key-value構造への対応不足）

### 2. 検証SQLスクリプトの作成 ✓

**作成したファイル**:
1. `verify-all-invoices.sql` - 全請求書の詳細検証
2. `verify-all-invoices-summary.sql` - 問題の統計サマリー

これらのスクリプトで：
- どの請求書が間違っているか特定できます
- 現在の値と正しい値を比較できます
- 問題の規模を把握できます

### 3. データ修正SQLスクリプトの作成 ✓

**作成したファイル**:
1. `add-support-fee-percent-setting.sql` - サポート手数料率の設定追加
2. `fix-all-invoices-comprehensive.sql` - 全請求書の包括的な修正
3. `fix-specific-invoices.sql` - 特定請求書の修正（INV-E9331B33, INV-A0D5CA6B）

`fix-all-invoices-comprehensive.sql` の特徴:
- システム設定から動的にサポート手数料率を取得
- サポート有効/無効の両方に対応
- 契約情報がない請求書にも対応
- support_enabledがNULLのケースにも対応
- 修正後の検証クエリも含む

### 4. データベース制約の追加 ✓

**ファイル**: `add-invoice-constraints.sql`

追加した制約:
- `base_amount` は正の値
- `fee_amount` は0以上でbase_amount以下
- `total_amount` はbase_amount以下（受注者請求の場合）
- `system_fee` は正の値
- `system_fee` はtotal_amount未満（受注者請求の場合）

これにより、今後間違ったデータを挿入しようとするとエラーになります。

### 5. 計算ロジックの一元化 ✓

**ファイル**: `src/lib/invoice-calculations.ts`

提供する関数:
- `calculateWithholding(subtotal)` - 源泉徴収税の計算
- `calculateInvoiceAmounts(contractAmount, supportFeePercent, supportEnabled)` - 全金額の計算
- `validateInvoiceAmounts(invoiceData, supportFeePercent, supportEnabled)` - データの検証
- `calculateInvoiceAmountsFromContracts(contracts, supportFeePercent)` - 複数契約からの計算

これにより：
- フロントエンド・バックエンドで同じロジックを使用
- 計算ミスが発生しない
- メンテナンスが容易

### 6. APIの修正 ✓

**ファイル**: `src/app/api/contractor-invoices/route.ts`

変更内容:
1. 一元化された計算ロジックの使用
2. システム設定をkey-value構造から正しく取得
3. データ保存前のバリデーション追加
4. エラーメッセージの改善

修正箇所:
- `src/app/api/contractor-invoices/route.ts:99-105` - システム設定取得
- `src/app/api/contractor-invoices/route.ts:107-119` - 計算ロジック
- `src/app/api/contractor-invoices/route.ts:196-219` - バリデーション

## 実施が必要な手順

### ステップ1: データベース制約を追加（推奨：修正前）

```bash
# Supabase CLIで実行
supabase db execute -f supabase/add-invoice-constraints.sql
```

または、Supabase Dashboardで実行してください。

**注意**: 既存の間違ったデータがある場合、制約追加がエラーになる可能性があります。
その場合は先にステップ2のデータ修正を行ってから、制約を追加してください。

### ステップ2: 既存データの検証と修正

#### 2a. まず検証を実行

```bash
# サマリーを確認
supabase db execute -f supabase/verify-all-invoices-summary.sql

# 詳細を確認
supabase db execute -f supabase/verify-all-invoices.sql
```

#### 2b. サポート手数料率の設定を確認・追加

```bash
supabase db execute -f supabase/add-support-fee-percent-setting.sql
```

#### 2c. 全請求書データを修正

```bash
supabase db execute -f supabase/fix-all-invoices-comprehensive.sql
```

このスクリプトは：
- 全ての請求書を正しい値に修正
- 契約情報がない請求書も処理
- 修正結果の検証も実行

#### 2d. 再度検証して確認

```bash
supabase db execute -f supabase/verify-all-invoices-summary.sql
```

全ての請求書が「✓ 正常」になっていることを確認してください。

### ステップ3: アプリケーションのデプロイ

修正されたコードをデプロイしてください：

```bash
git add src/lib/invoice-calculations.ts
git add src/app/api/contractor-invoices/route.ts
git commit -m "請求書計算ロジックの修正と再発防止策の実装

- 計算ロジックを一元化（invoice-calculations.ts）
- APIバリデーションを追加
- システム設定のkey-value構造に対応

Fixes: 請求書計算エラー"

git push
```

### ステップ4: 動作確認

1. 新しい請求書を作成してみて、金額が正しく計算されることを確認
2. サポート有効/無効の両方のケースをテスト
3. エラーケース（契約金額が負など）が正しく検証されることを確認

## 今後の開発での注意点

### 計算ロジックを変更する場合

**✗ 間違い**: 各所で独自に計算
```typescript
const supportFee = Math.round(contractAmount * 0.08)
```

**✓ 正しい**: 一元化されたライブラリを使用
```typescript
import { calculateInvoiceAmounts } from '@/lib/invoice-calculations'

const amounts = calculateInvoiceAmounts(contractAmount, supportFeePercent, supportEnabled)
```

### データを保存する前に

**必ず検証関数を使用**:
```typescript
import { validateInvoiceAmounts } from '@/lib/invoice-calculations'

const errors = validateInvoiceAmounts(invoiceData, supportFeePercent, supportEnabled)
if (errors.length > 0) {
  throw new Error(errors.join(', '))
}
```

### 新しい請求書API/機能を作成する場合

1. `src/lib/invoice-calculations.ts` の関数を使用
2. データ保存前に必ず `validateInvoiceAmounts()` を実行
3. システム設定は key-value 構造から取得:
   ```typescript
   const { data } = await supabase
     .from('system_settings')
     .select('setting_value')
     .eq('setting_key', 'support_fee_percent')
     .single()
   ```

## トラブルシューティング

### 制約追加でエラーが出る場合

```
ERROR: check constraint "check_total_amount_valid" is violated by some row
```

→ 先にステップ2のデータ修正を実行してから、制約を追加してください

### 計算が合わない場合

1. `verify-all-invoices.sql` で該当請求書を確認
2. どのフィールドが間違っているか特定
3. `fix-all-invoices-comprehensive.sql` を再実行
4. それでも直らない場合は契約データを確認（support_enabledがNULLになっていないか等）

### APIでバリデーションエラーが出る場合

エラーレスポンスの `debug` フィールドを確認：
```json
{
  "message": "請求書データの計算に誤りがあります",
  "errors": ["サポート料（fee_amount）が正しくありません。期待値: 1600, 実際: 2042"],
  "debug": {
    "contracts": [...],
    "supportPercent": 8,
    "invoiceData": {...}
  }
}
```

## テストの追加（今後の課題）

`src/lib/invoice-calculations.test.ts` を作成して、以下のテストを追加することを推奨：

```typescript
describe('Invoice Calculations', () => {
  it('should calculate support fee correctly', () => {
    const result = calculateInvoiceAmounts(20000, 8, true)
    expect(result.fee_amount).toBe(1600)
    expect(result.total_amount).toBe(18400)
  })

  it('should calculate withholding tax for amount <= 1M', () => {
    const result = calculateWithholding(500000)
    expect(result).toBe(Math.floor(500000 * 0.1021))
  })

  it('should calculate withholding tax for amount > 1M', () => {
    const result = calculateWithholding(1500000)
    expect(result).toBe(Math.floor((1500000 - 1000000) * 0.2042 + 102100))
  })

  // 他のテストケース...
})
```

## まとめ

### 完了したこと
- ✓ 根本原因の特定と分析
- ✓ 検証SQLスクリプトの作成
- ✓ データ修正SQLスクリプトの作成
- ✓ データベース制約の作成
- ✓ 計算ロジックの一元化
- ✓ APIの修正とバリデーション追加

### これから実施すること
1. データベース制約の追加
2. 既存データの修正
3. コードのデプロイ
4. 動作確認
5. （オプション）テストの追加

### 再発防止策
- データベースレベル: CHECK制約で不正データを防止
- アプリケーションレベル: バリデーション関数で保存前チェック
- コードレベル: 計算ロジックの一元化で計算ミスを防止

この実装により、今後同じような計算エラーは発生しなくなります。
