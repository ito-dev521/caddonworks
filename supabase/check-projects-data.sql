-- プロジェクトデータの存在確認
SELECT 
  id,
  title,
  org_id,
  contractor_id,
  created_by,
  status,
  created_at
FROM projects 
ORDER BY created_at DESC 
LIMIT 10;
