-- projectsテーブルにcreated_byカラムを追加し、既存データを修正

-- 1. created_byカラムを追加（既に存在する場合はスキップ）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- 3. 既存のプロジェクトに対してcreated_byを設定
-- 各プロジェクトの組織の管理者を作成者として設定
UPDATE projects 
SET created_by = (
  SELECT u.id 
  FROM users u 
  INNER JOIN memberships m ON u.id = m.user_id 
  WHERE m.org_id = projects.org_id 
    AND m.role = 'OrgAdmin' 
  ORDER BY m.created_at ASC
  LIMIT 1
) 
WHERE created_by IS NULL;

-- 4. 結果を確認
SELECT 
  p.id,
  p.title,
  p.org_id,
  p.created_by,
  u.display_name as creator_name,
  u.email as creator_email
FROM projects p
LEFT JOIN users u ON p.created_by = u.id
ORDER BY p.created_at DESC
LIMIT 10;
