-- 最小限のテーブルセットアップスクリプト

-- 1. 既存のテーブルを削除（存在する場合のみ）
DROP TABLE IF EXISTS project_attachments CASCADE;
DROP TABLE IF EXISTS billing CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS favorite_contractors CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- 2. projectsテーブルを作成（最小限の構造）
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'bidding' CHECK (status IN ('bidding', 'in_progress', 'completed', 'cancelled')),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. chat_messagesテーブルを作成
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'contractor')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. project_attachmentsテーブルを作成
CREATE TABLE project_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. 基本的なインデックスを作成
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_project_attachments_project_id ON project_attachments(project_id);

-- 6. RLSを有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- 7. 基本的なRLSポリシーを作成
-- projectsテーブルのポリシー
CREATE POLICY "Users can view projects from their organization" ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage projects" ON projects
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'OrgAdmin'
    )
  );

-- chat_messagesテーブルのポリシー
CREATE POLICY "Users can view messages from their projects" ON chat_messages
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert messages to their projects" ON chat_messages
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- project_attachmentsテーブルのポリシー
CREATE POLICY "Users can view attachments from their projects" ON project_attachments
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage attachments from their projects" ON project_attachments
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- 8. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 9. テストデータの挿入
DO $$
DECLARE
    demo_org_id UUID;
    demo_contractor_id UUID;
BEGIN
    -- デモ組織のIDを取得
    SELECT id INTO demo_org_id FROM organizations WHERE name = 'デモ建設株式会社' LIMIT 1;
    
    -- デモ受注者のIDを取得
    SELECT id INTO demo_contractor_id FROM users WHERE email = 'contractor@demo.com' LIMIT 1;
    
    -- テスト案件を挿入
    IF demo_org_id IS NOT NULL THEN
        INSERT INTO projects (title, description, budget, start_date, end_date, category, org_id, contractor_id, status)
        VALUES 
        ('道路拡張工事', '主要道路の拡張工事プロジェクト', 5000000, '2024-01-15', '2024-06-30', '道路設計', demo_org_id, demo_contractor_id, 'in_progress'),
        ('橋梁補修工事', '老朽化した橋梁の補修工事', 3000000, '2024-02-01', '2024-08-31', '橋梁設計', demo_org_id, NULL, 'bidding'),
        ('下水道整備工事', '新規下水道管の敷設工事', 8000000, '2024-03-01', '2024-12-31', '下水道設計', demo_org_id, NULL, 'bidding');
    END IF;
END $$;
