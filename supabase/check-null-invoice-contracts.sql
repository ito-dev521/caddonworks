-- invoice_number が NULL の請求書の契約情報を確認

SELECT
  c.id as contract_id,
  c.bid_amount,
  c.support_enabled,
  c.contractor_id,
  p.title as project_title,
  p.id as project_id
FROM public.contracts c
LEFT JOIN public.projects p ON c.project_id = p.id
WHERE c.id IN (
  '88e5b82e-70f3-476f-875b-1d318c7a9900',
  '9adbb117-64bc-43ef-9249-69294c720eef',
  '401cbb50-6e4c-40bd-bec3-1f7c78f9bc52'
);
