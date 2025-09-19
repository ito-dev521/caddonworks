-- 契約テーブルに辞退関連と金額調整関連のカラムを追加

-- 金額調整関連のカラムを追加
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS original_bid_amount INTEGER,
ADD COLUMN IF NOT EXISTS amount_adjusted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS adjustment_comment TEXT;

-- 辞退関連のカラムを追加
ALTER TABLE contracts 
ADD COLUMN IF NOT EXISTS decline_reason TEXT,
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMP WITH TIME ZONE;

-- ステータスの制約を更新（declinedを追加）
ALTER TABLE contracts 
DROP CONSTRAINT IF EXISTS contracts_status_check;

ALTER TABLE contracts 
ADD CONSTRAINT contracts_status_check 
CHECK (status IN ('draft', 'pending_contractor', 'pending_org', 'signed', 'completed', 'cancelled', 'declined'));

-- インデックスの追加
CREATE INDEX IF NOT EXISTS idx_contracts_amount_adjusted ON contracts(amount_adjusted);
CREATE INDEX IF NOT EXISTS idx_contracts_declined_at ON contracts(declined_at);

-- コメントの追加
COMMENT ON COLUMN contracts.original_bid_amount IS '元の入札金額';
COMMENT ON COLUMN contracts.amount_adjusted IS '金額が調整されたかどうか';
COMMENT ON COLUMN contracts.adjustment_comment IS '金額調整の理由・コメント';
COMMENT ON COLUMN contracts.decline_reason IS '契約辞退の理由';
COMMENT ON COLUMN contracts.declined_at IS '契約辞退日時';
