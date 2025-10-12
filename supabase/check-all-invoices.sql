-- 全ての請求書を確認（direction = 'to_operator'）

SELECT
  invoice_number as 請求書番号,
  base_amount as DB契約金額,
  fee_amount as DBサポート料,
  total_amount as DB小計,
  system_fee as DB源泉税,
  total_amount - system_fee as DB請求額,
  direction,
  updated_at as 更新日時
FROM public.invoices
WHERE direction = 'to_operator'
ORDER BY updated_at DESC;
