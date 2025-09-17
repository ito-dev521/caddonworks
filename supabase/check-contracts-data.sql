-- 契約データの確認
SELECT 
  c.id,
  c.project_id,
  c.contractor_id,
  c.org_id,
  c.status,
  c.created_at,
  p.title as project_title,
  u.display_name as contractor_name,
  o.name as org_name
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN users u ON c.contractor_id = u.id
LEFT JOIN organizations o ON c.org_id = o.id
ORDER BY c.created_at DESC;

-- 完了ステータスの契約データ
SELECT 
  c.id,
  c.project_id,
  c.contractor_id,
  c.org_id,
  c.status,
  c.created_at,
  p.title as project_title,
  u.display_name as contractor_name,
  o.name as org_name
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN users u ON c.contractor_id = u.id
LEFT JOIN organizations o ON c.org_id = o.id
WHERE c.status = 'completed'
ORDER BY c.created_at DESC;

-- 特定のプロジェクトの契約データ
SELECT 
  c.id,
  c.project_id,
  c.contractor_id,
  c.org_id,
  c.status,
  c.created_at,
  p.title as project_title,
  u.display_name as contractor_name,
  o.name as org_name
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN users u ON c.contractor_id = u.id
LEFT JOIN organizations o ON c.org_id = o.id
WHERE c.project_id IN (
  '2de6c4d4-83f4-4594-a53a-be14cb09108f',
  '64aee52e-3b67-4ae8-a34b-ef4e3bdddd88',
  '95901dd9-b991-4cb8-8495-7ed30fbeb263'
)
ORDER BY c.created_at DESC;
