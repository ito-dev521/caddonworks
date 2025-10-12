-- 縦断図作成の請求書を確認（シンプル版）

SELECT
  i.id,
  i.invoice_number,
  i.base_amount,
  i.fee_amount,
  i.total_amount,
  i.system_fee,
  i.direction
FROM public.invoices i
WHERE i.invoice_number = 'INV-E9331B33';
