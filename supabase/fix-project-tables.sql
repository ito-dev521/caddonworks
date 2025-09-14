-- 既存のテーブル構造に合わせた修正版テーブル作成スクリプト

-- 1. 既存のprojectsテーブルを削除（存在する場合）
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS favorite_contractors CASCADE;
DROP TABLE IF EXISTS contracts CASCADE;
DROP TABLE IF EXISTS billing CASCADE;

-- 2. projectsテーブル（案件テーブル）を再作成
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  budget INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'bidding' CHECK (status IN ('bidding', 'in_progress', 'completed', 'cancelled')),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. chat_messagesテーブル（チャットメッセージテーブル）を再作成
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('client', 'contractor')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. favorite_contractorsテーブル（お気に入り受注者テーブル）を再作成
CREATE TABLE favorite_contractors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(org_id, contractor_id)
);

-- 5. contractsテーブル（契約テーブル）を再作成
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'signed', 'cancelled')),
  amount INTEGER NOT NULL,
  signed_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. billingテーブル（請求テーブル）を再作成
CREATE TABLE billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  paid_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. インデックスの作成
CREATE INDEX idx_projects_org_id ON projects(org_id);
CREATE INDEX idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_favorite_contractors_org_id ON favorite_contractors(org_id);
CREATE INDEX idx_contracts_project_id ON contracts(project_id);
CREATE INDEX idx_billing_project_id ON billing(project_id);

-- 8. RLS（Row Level Security）の有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing ENABLE ROW LEVEL SECURITY;

-- 9. 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view projects from their organization" ON projects;
DROP POLICY IF EXISTS "OrgAdmins can insert projects" ON projects;
DROP POLICY IF EXISTS "OrgAdmins can update projects" ON projects;
DROP POLICY IF EXISTS "OrgAdmins can delete projects" ON projects;
DROP POLICY IF EXISTS "Users can view messages from their projects" ON chat_messages;
DROP POLICY IF EXISTS "Users can insert messages to their projects" ON chat_messages;
DROP POLICY IF EXISTS "Users can view favorite contractors from their organization" ON favorite_contractors;
DROP POLICY IF EXISTS "OrgAdmins can manage favorite contractors" ON favorite_contractors;
DROP POLICY IF EXISTS "Users can view contracts from their organization" ON contracts;
DROP POLICY IF EXISTS "OrgAdmins can manage contracts" ON contracts;
DROP POLICY IF EXISTS "Users can view billing from their organization" ON billing;
DROP POLICY IF EXISTS "OrgAdmins can manage billing" ON billing;

-- 10. RLSポリシーの作成
-- projectsテーブルのポリシー
CREATE POLICY "Users can view projects from their organization" ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can insert projects" ON projects
  FOR INSERT WITH CHECK (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'OrgAdmin'
    )
  );

CREATE POLICY "OrgAdmins can update projects" ON projects
  FOR UPDATE USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'OrgAdmin'
    )
  );

CREATE POLICY "OrgAdmins can delete projects" ON projects
  FOR DELETE USING (
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

-- favorite_contractorsテーブルのポリシー
CREATE POLICY "Users can view favorite contractors from their organization" ON favorite_contractors
  FOR SELECT USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage favorite contractors" ON favorite_contractors
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() AND role = 'OrgAdmin'
    )
  );

-- contractsテーブルのポリシー
CREATE POLICY "Users can view contracts from their organization" ON contracts
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage contracts" ON contracts
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- billingテーブルのポリシー
CREATE POLICY "Users can view billing from their organization" ON billing
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage billing" ON billing
  FOR ALL USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- 11. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_billing_updated_at BEFORE UPDATE ON billing
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
