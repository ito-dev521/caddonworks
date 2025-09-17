-- 案件データの確認と修正
-- 特定の案件の詳細を確認し、必要に応じて修正

-- 1. 問題の案件の詳細を確認
SELECT 
  id,
  title,
  status,
  contractor_id,
  org_id,
  created_at
FROM projects 
WHERE id = '7161775d-a8ad-44f3-8d78-53455f896d75';

-- 2. この案件に関連する契約データを確認
SELECT 
  c.id as contract_id,
  c.project_id,
  c.contractor_id,
  c.status as contract_status,
  c.created_at
FROM contracts c
WHERE c.project_id = '7161775d-a8ad-44f3-8d78-53455f896d75';

-- 3. 受注者のユーザー情報を確認
SELECT 
  id,
  email,
  display_name,
  role
FROM users 
WHERE id = 'fcf21fbd-60bf-4f3f-aede-d9d540704cd9';

-- 4. 受注者の組織メンバーシップを確認
SELECT 
  m.id,
  m.user_id,
  m.org_id,
  m.role,
  o.name as org_name
FROM memberships m
JOIN organizations o ON m.org_id = o.id
WHERE m.user_id = 'fcf21fbd-60bf-4f3f-aede-d9d540704cd9';

-- 5. 案件の組織情報を確認
SELECT 
  o.id,
  o.name,
  o.email
FROM organizations o
WHERE o.id = 'f0ee631b-8c3f-407f-abd0-385a5212ca20';
