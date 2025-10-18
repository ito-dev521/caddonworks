-- 注文請書の生成状況を確認
SELECT
  id as contract_id,
  contract_title,
  order_acceptance_number,
  order_acceptance_box_id,
  order_acceptance_sign_request_id,
  order_acceptance_signed_at
FROM contracts
WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';
