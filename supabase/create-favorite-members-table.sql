-- お気に入り会員管理テーブルの作成
-- 発注者が受注者をお気に入り登録し、優先的に案件を依頼できる機能

-- 1. favorite_membersテーブルの作成
CREATE TABLE IF NOT EXISTS favorite_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT, -- お気に入り登録時のメモ
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_favorite_members_org_id ON favorite_members(org_id);
CREATE INDEX IF NOT EXISTS idx_favorite_members_contractor_id ON favorite_members(contractor_id);
CREATE INDEX IF NOT EXISTS idx_favorite_members_added_by ON favorite_members(added_by);
CREATE INDEX IF NOT EXISTS idx_favorite_members_is_active ON favorite_members(is_active);

-- 3. 一意制約（同じ組織が同じ受注者を重複登録できないようにする）
CREATE UNIQUE INDEX IF NOT EXISTS idx_favorite_members_unique 
ON favorite_members(org_id, contractor_id) 
WHERE is_active = true;

-- 4. 優先依頼テーブルの作成
CREATE TABLE IF NOT EXISTS priority_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  responded_at TIMESTAMP WITH TIME ZONE,
  response TEXT CHECK (response IN ('accepted', 'declined', 'pending')),
  response_notes TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 優先依頼テーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_priority_invitations_project_id ON priority_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_priority_invitations_contractor_id ON priority_invitations(contractor_id);
CREATE INDEX IF NOT EXISTS idx_priority_invitations_org_id ON priority_invitations(org_id);
CREATE INDEX IF NOT EXISTS idx_priority_invitations_response ON priority_invitations(response);
CREATE INDEX IF NOT EXISTS idx_priority_invitations_expires_at ON priority_invitations(expires_at);

-- 6. 一意制約（同じ案件に同じ受注者を重複招待できないようにする）
CREATE UNIQUE INDEX IF NOT EXISTS idx_priority_invitations_unique 
ON priority_invitations(project_id, contractor_id);

-- 7. RLSポリシーの設定
ALTER TABLE favorite_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE priority_invitations ENABLE ROW LEVEL SECURITY;

-- お気に入り会員テーブルのRLSポリシー
-- 組織メンバーは自分の組織のお気に入り会員を閲覧・管理可能
CREATE POLICY "組織メンバーはお気に入り会員を管理可能" ON favorite_members
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('OrgAdmin', 'Staff')
    )
  );

-- 受注者は自分がお気に入り登録されているかを確認可能
CREATE POLICY "受注者は自分のお気に入り状況を確認可能" ON favorite_members
  FOR SELECT USING (contractor_id = auth.uid());

-- 優先依頼テーブルのRLSポリシー
-- 組織メンバーは自分の組織の優先依頼を管理可能
CREATE POLICY "組織メンバーは優先依頼を管理可能" ON priority_invitations
  FOR ALL USING (
    org_id IN (
      SELECT org_id FROM memberships 
      WHERE user_id = auth.uid() 
      AND role IN ('OrgAdmin', 'Staff')
    )
  );

-- 受注者は自分宛の優先依頼を閲覧・応答可能
CREATE POLICY "受注者は自分宛の優先依頼を管理可能" ON priority_invitations
  FOR ALL USING (contractor_id = auth.uid());

-- 8. 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーの作成
CREATE TRIGGER update_favorite_members_updated_at 
  BEFORE UPDATE ON favorite_members 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_priority_invitations_updated_at 
  BEFORE UPDATE ON priority_invitations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
