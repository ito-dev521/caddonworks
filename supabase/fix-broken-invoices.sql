-- 壊れた請求書データを調査・修正

-- ステップ1: contract_idがNULLまたはデータが不整合な請求書を確認
SELECT
  i.id,
  i.invoice_number,
  i.contract_id,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.status as ステータス,
  CASE
    WHEN i.contract_id IS NULL THEN '契約ID NULL'
    WHEN i.total_amount > i.base_amount THEN '小計 > 契約金額'
    WHEN i.base_amount < 0 THEN '契約金額が負'
    ELSE 'その他の異常'
  END as 問題
FROM public.invoices i
WHERE i.direction = 'to_operator'
  AND (
    i.contract_id IS NULL
    OR i.total_amount > i.base_amount
    OR i.base_amount < 0
    OR i.total_amount < 0
  )
ORDER BY i.updated_at DESC;

-- ステップ2: これらの壊れた請求書を削除（実行前に上記のSELECT結果を確認）
-- ※注意: この操作は取り消せません。必ず確認してから実行してください。

-- DELETE FROM public.invoices
-- WHERE direction = 'to_operator'
--   AND (
--     contract_id IS NULL
--     OR total_amount > base_amount
--     OR base_amount < 0
--     OR total_amount < 0
--   );
