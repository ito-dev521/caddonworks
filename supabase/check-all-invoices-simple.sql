-- 全ての請求書を確認（directionフィルタなし）

SELECT
  id,
  invoice_number as 請求書番号,
  base_amount as DB契約金額,
  fee_amount as DBサポート料,
  total_amount as DB小計,
  system_fee as DB源泉税,
  contractor_id,
  org_id
FROM public.invoices
ORDER BY id DESC
LIMIT 20;
