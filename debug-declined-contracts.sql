-- 辞退案件の契約状況を確認するクエリ
-- 特定のユーザーの全契約を時系列で表示

SELECT 
  c.id as contract_id,
  c.project_id,
  p.title as project_title,
  c.contractor_id,
  u.display_name as contractor_name,
  c.status as contract_status,
  c.created_at as contract_created_at,
  c.bid_amount,
  p.status as project_status
FROM contracts c
JOIN projects p ON c.project_id = p.id
JOIN users u ON c.contractor_id = u.id
WHERE c.contractor_id = (
  SELECT id FROM users WHERE email = 'contractor@demo.com' -- 受注者のメールアドレスに置き換え
)
ORDER BY c.project_id, c.created_at DESC;

-- プロジェクトごとの最新契約ステータスを確認
WITH latest_contracts AS (
  SELECT DISTINCT ON (project_id) 
    project_id,
    status as latest_status,
    created_at,
    bid_amount
  FROM contracts 
  WHERE contractor_id = (
    SELECT id FROM users WHERE email = 'contractor@demo.com' -- 受注者のメールアドレスに置き換え
  )
  ORDER BY project_id, created_at DESC
)
SELECT 
  lc.project_id,
  p.title,
  lc.latest_status,
  lc.created_at as latest_contract_date,
  lc.bid_amount,
  p.status as project_status
FROM latest_contracts lc
JOIN projects p ON lc.project_id = p.id
ORDER BY lc.created_at DESC;
