-- 特定の請求書の実際のデータベース値を確認

SELECT
  invoice_number as 請求書番号,
  base_amount as DB契約金額,
  fee_amount as DBサポート料,
  total_amount as DB小計,
  system_fee as DB源泉税,
  total_amount - system_fee as DB請求額,
  updated_at as 更新日時
FROM public.invoices
WHERE invoice_number IN ('INV-E9331B33', 'INV-A0D5CA6B', 'INV-CAC3024D')
ORDER BY invoice_number;
