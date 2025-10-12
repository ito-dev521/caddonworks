-- ブロック積み展開図作成の請求書を直接確認

SELECT
  i.id,
  i.invoice_number,
  i.base_amount as DB契約金額,
  i.fee_amount as DBサポート料,
  i.total_amount as DB小計,
  i.system_fee as DB源泉税,
  i.total_amount - i.system_fee as DB請求額,
  i.contract_id,
  i.updated_at
FROM public.invoices i
WHERE i.id = 'a0d5ca6b-dcb7-4372-b1cb-5797e23d596c';
