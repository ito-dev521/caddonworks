-- 入札テーブルに金額交渉用のフィールドを追加

-- 金額交渉ステータスを追加
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS negotiation_status VARCHAR(20) DEFAULT 'pending';

-- 拒否理由を追加
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 受注者の拒否理由への同意フラグを追加
ALTER TABLE bids 
ADD COLUMN IF NOT EXISTS contractor_agrees_to_rejection BOOLEAN DEFAULT NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_bids_negotiation_status ON bids(negotiation_status);

-- 既存の入札データに対してデフォルト値を設定
UPDATE bids 
SET negotiation_status = 'pending' 
WHERE negotiation_status IS NULL;

-- コメント追加
COMMENT ON COLUMN bids.negotiation_status IS '金額交渉ステータス: pending, approved, rejected, cancelled';
COMMENT ON COLUMN bids.rejection_reason IS '発注者が入札金額を拒否した理由';
COMMENT ON COLUMN bids.contractor_agrees_to_rejection IS '受注者が拒否理由に同意したかどうか';

-- データ確認
SELECT 
  id,
  project_id,
  contractor_id,
  bid_amount,
  proposal,
  budget_approved,
  negotiation_status,
  rejection_reason,
  contractor_agrees_to_rejection,
  status,
  created_at
FROM bids 
ORDER BY created_at DESC 
LIMIT 5;
