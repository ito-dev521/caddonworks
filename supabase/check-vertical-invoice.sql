-- 縦断図作成の請求書を確認

SELECT
  i.id,
  i.invoice_number,
  i.contract_id,
  i.base_amount as 契約金額,
  i.fee_amount as サポート料,
  i.total_amount as 小計,
  i.system_fee as 源泉税,
  i.direction,
  p.title as プロジェクト名,
  c.support_enabled as サポート有効,
  c.id as contract_id_check
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON c.project_id = p.id
WHERE i.invoice_number = 'INV-E9331B33'
   OR p.title LIKE '%縦断図%'
ORDER BY i.updated_at DESC;
