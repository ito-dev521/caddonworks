-- projectsテーブルの修正とカラム追加
-- 既存のテーブル構造に合わせて必要なカラムを追加

-- 1. まず、projectsテーブルが存在するか確認し、存在しない場合は作成
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'bidding' CHECK (status IN ('bidding', 'in_progress', 'completed', 'cancelled')),
  budget INTEGER,
  start_date DATE,
  end_date DATE,
  category VARCHAR(100),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assignee_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 不足しているカラムを追加（既に存在する場合はスキップ）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS contractor_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assignee_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS bidding_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_projects_org_id ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_contractor_id ON projects(contractor_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- 4. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーが存在しない場合のみ作成
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_projects_updated_at') THEN
        CREATE TRIGGER update_projects_updated_at 
            BEFORE UPDATE ON projects 
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$;

-- 5. RLS (Row Level Security) の設定
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view projects from their organization" ON projects;
DROP POLICY IF EXISTS "OrgAdmins can manage projects from their organization" ON projects;

-- 新しいポリシーを作成
CREATE POLICY "Users can view projects from their organization" ON projects
  FOR SELECT USING (
    org_id IN (
      SELECT m.org_id FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "OrgAdmins can manage projects from their organization" ON projects
  FOR ALL USING (
    org_id IN (
      SELECT m.org_id FROM memberships m
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- 6. コメント
COMMENT ON TABLE projects IS '案件情報を管理するテーブル';
COMMENT ON COLUMN projects.title IS '案件名';
COMMENT ON COLUMN projects.description IS '案件説明';
COMMENT ON COLUMN projects.status IS '案件ステータス（bidding: 入札中, in_progress: 進行中, completed: 完了, cancelled: キャンセル）';
COMMENT ON COLUMN projects.budget IS '予算（円）';
COMMENT ON COLUMN projects.start_date IS '開始日';
COMMENT ON COLUMN projects.end_date IS '終了日';
COMMENT ON COLUMN projects.category IS '案件カテゴリ';
COMMENT ON COLUMN projects.org_id IS '発注組織ID';
COMMENT ON COLUMN projects.contractor_id IS '受注者ID';
COMMENT ON COLUMN projects.assignee_name IS '担当者名';
COMMENT ON COLUMN projects.bidding_deadline IS '入札締切日時';
COMMENT ON COLUMN projects.requirements IS '案件の要件・条件';
COMMENT ON COLUMN projects.location IS '案件の場所・地域';
