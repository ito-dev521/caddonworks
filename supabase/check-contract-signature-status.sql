-- 契約の署名状況を確認
SELECT
  id as contract_id,
  contract_title,
  status as contract_status,
  signed_at,
  org_signed_at,
  contractor_signed_at,
  order_acceptance_signed_at,
  support_enabled
FROM contracts
WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';
