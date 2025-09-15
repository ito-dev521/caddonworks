-- 入札テーブルの作成
-- まず、projectsテーブルとusersテーブルが存在することを確認
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  bid_amount INTEGER NOT NULL CHECK (bid_amount > 0),
  proposal TEXT NOT NULL,
  estimated_duration INTEGER NOT NULL CHECK (estimated_duration > 0),
  start_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 一つの案件に対して同じ受注者は一度だけ入札可能
  UNIQUE(project_id, contractor_id)
);

-- 外部キー制約を後で追加（テーブルが存在することを確認してから）
DO $$
BEGIN
    -- projectsテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE bids ADD CONSTRAINT fk_bids_project_id 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    -- usersテーブルが存在する場合のみ外部キー制約を追加
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE bids ADD CONSTRAINT fk_bids_contractor_id 
            FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_bids_project_id ON bids(project_id);
CREATE INDEX IF NOT EXISTS idx_bids_contractor_id ON bids(contractor_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bids_updated_at 
    BEFORE UPDATE ON bids 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) の設定
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- 受注者は自分の入札のみ閲覧可能
CREATE POLICY "Contractors can view their own bids" ON bids
  FOR SELECT USING (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 受注者は自分の入札のみ作成可能
CREATE POLICY "Contractors can create their own bids" ON bids
  FOR INSERT WITH CHECK (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 受注者は自分の入札のみ更新可能（ただし、受付済みの場合は不可）
CREATE POLICY "Contractors can update their own bids" ON bids
  FOR UPDATE USING (
    contractor_id IN (
      SELECT id FROM users 
      WHERE auth_user_id = auth.uid()
    ) AND status = 'submitted'
  );

-- 発注者は自分の案件の入札を閲覧可能
CREATE POLICY "Clients can view bids for their projects" ON bids
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- 発注者は自分の案件の入札を更新可能（受付・却下）
CREATE POLICY "Clients can update bids for their projects" ON bids
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      JOIN users u ON m.user_id = u.id
      WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
    )
  );

-- コメント
COMMENT ON TABLE bids IS '入札情報を管理するテーブル';
COMMENT ON COLUMN bids.project_id IS '案件ID';
COMMENT ON COLUMN bids.contractor_id IS '受注者ID';
COMMENT ON COLUMN bids.bid_amount IS '入札金額（円）';
COMMENT ON COLUMN bids.proposal IS '提案内容';
COMMENT ON COLUMN bids.estimated_duration IS '想定期間（日数）';
COMMENT ON COLUMN bids.start_date IS '開始予定日';
COMMENT ON COLUMN bids.status IS '入札ステータス（submitted: 提出済み, accepted: 受付, rejected: 却下, withdrawn: 取り下げ）';
