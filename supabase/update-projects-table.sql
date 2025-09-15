-- projectsテーブルに新しいカラムを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS bidding_deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS requirements TEXT,
ADD COLUMN IF NOT EXISTS location VARCHAR(255);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location);

-- コメント
COMMENT ON COLUMN projects.bidding_deadline IS '入札締切日時';
COMMENT ON COLUMN projects.requirements IS '案件の要件・条件';
COMMENT ON COLUMN projects.location IS '案件の場所・地域';
