-- 請求書テーブルにデータ整合性制約を追加

-- 1. base_amountは正の値でなければならない
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS check_base_amount_positive
CHECK (base_amount > 0);

-- 2. fee_amountは0以上でbase_amount以下でなければならない
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS check_fee_amount_valid
CHECK (fee_amount >= 0 AND fee_amount <= base_amount);

-- 3. 受注者への請求書の場合、total_amountはbase_amount以下でなければならない
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS check_total_amount_valid
CHECK (
  (direction = 'to_operator' AND total_amount > 0 AND total_amount <= base_amount)
  OR (direction != 'to_operator')
);

-- 4. system_feeは0以上でなければならない
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS check_system_fee_positive
CHECK (system_fee >= 0);

-- 5. 受注者への請求書の場合、system_feeはtotal_amount未満でなければならない
ALTER TABLE public.invoices
ADD CONSTRAINT IF NOT EXISTS check_system_fee_valid
CHECK (
  (direction = 'to_operator' AND system_fee < total_amount)
  OR (direction != 'to_operator')
);

-- 確認: 制約が追加されたことを確認
SELECT
  conname as 制約名,
  pg_get_constraintdef(oid) as 制約定義
FROM pg_constraint
WHERE conrelid = 'public.invoices'::regclass
  AND contype = 'c'  -- CHECK制約のみ
ORDER BY conname;
