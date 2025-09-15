-- 案件データの確認
SELECT 
  id,
  title,
  description,
  status,
  budget,
  start_date,
  end_date,
  category,
  org_id,
  assignee_name,
  bidding_deadline,
  requirements,
  location,
  created_at
FROM projects 
WHERE status = 'bidding'
ORDER BY created_at DESC;

-- 案件数の確認
SELECT 
  status,
  COUNT(*) as count
FROM projects 
GROUP BY status;

-- 組織データの確認
SELECT 
  id,
  name,
  email,
  corporate_number
FROM organizations
LIMIT 5;
