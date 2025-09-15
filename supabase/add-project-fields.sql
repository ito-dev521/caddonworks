-- 案件テーブルに新しいフィールドを追加

-- 入札締切日フィールドを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS bidding_deadline DATE;

-- 募集人数フィールドを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS required_contractors INTEGER DEFAULT 1;

-- 既存の案件データに対してデフォルト値を設定
UPDATE projects 
SET required_contractors = 1 
WHERE required_contractors IS NULL;

-- 入札締切日のデフォルト値を設定（開始日の3日前）
UPDATE projects 
SET bidding_deadline = start_date - INTERVAL '3 days'
WHERE bidding_deadline IS NULL AND start_date IS NOT NULL;

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_projects_bidding_deadline ON projects(bidding_deadline);
CREATE INDEX IF NOT EXISTS idx_projects_required_contractors ON projects(required_contractors);

-- コメント追加
COMMENT ON COLUMN projects.bidding_deadline IS '入札締切日';
COMMENT ON COLUMN projects.required_contractors IS '募集する受注者の人数';

-- データ確認
SELECT 
  id,
  title,
  bidding_deadline,
  required_contractors,
  start_date,
  end_date,
  budget
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;
