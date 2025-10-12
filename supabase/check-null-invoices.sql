-- invoice_number が NULL の請求書を詳細確認

SELECT
  i.id,
  i.invoice_number,
  i.base_amount,
  i.fee_amount,
  i.total_amount,
  i.system_fee,
  i.contractor_id,
  i.contract_id,
  i.project_id,
  i.org_id,
  c.id as contract_exists,
  c.support_enabled,
  c.bid_amount as contract_bid_amount,
  p.title as project_title
FROM public.invoices i
LEFT JOIN public.contracts c ON i.contract_id = c.id
LEFT JOIN public.projects p ON i.project_id = p.id
WHERE i.invoice_number IS NULL
  AND i.direction = 'to_operator'
ORDER BY i.id;
