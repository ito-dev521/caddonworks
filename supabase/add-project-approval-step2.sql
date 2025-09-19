-- ステップ2: プロジェクトテーブルに承認者IDを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_projects_approver_id ON projects(approver_id);
CREATE INDEX IF NOT EXISTS idx_organizations_approval_required ON organizations(approval_required);
