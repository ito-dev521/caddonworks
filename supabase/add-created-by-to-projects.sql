-- projectsテーブルにcreated_byカラムを追加
-- プロジェクト作成者の情報を保存するため

-- 1. created_byカラムを追加（既に存在する場合はスキップ）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- 2. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- 3. 既存のプロジェクトに対してcreated_byを設定する場合のサンプル
-- （実際の運用では、組織の管理者やassignee_nameから推測する必要がある）
-- UPDATE projects SET created_by = (
--   SELECT u.id FROM users u 
--   INNER JOIN memberships m ON u.id = m.user_id 
--   WHERE m.org_id = projects.org_id AND m.role = 'OrgAdmin' 
--   LIMIT 1
-- ) WHERE created_by IS NULL;
