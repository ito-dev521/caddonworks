-- 入札テーブルに新しいフィールドを追加

-- 予算承認フラグを追加
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS budget_approved BOOLEAN DEFAULT false;

-- 不要なフィールドを削除（既存データがある場合は注意）
-- ALTER TABLE bids DROP COLUMN IF EXISTS estimated_duration;
-- ALTER TABLE bids DROP COLUMN IF EXISTS start_date;

-- 既存の入札データに対してデフォルト値を設定
UPDATE bids 
SET budget_approved = true 
WHERE budget_approved IS NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_bids_budget_approved ON bids(budget_approved);

-- コメント追加
COMMENT ON COLUMN bids.budget_approved IS '発注者側の予算に同意したかどうか';

-- データ確認
SELECT 
  id,
  project_id,
  contractor_id,
  bid_amount,
  proposal,
  budget_approved,
  status,
  created_at
FROM bids 
ORDER BY created_at DESC 
LIMIT 5;
