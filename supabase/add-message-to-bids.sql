-- 入札テーブルにmessageフィールドを追加し、proposalの内容をコピー

-- 1. messageカラムを追加（proposalの内容をコピー）
ALTER TABLE bids ADD COLUMN IF NOT EXISTS message TEXT;

-- 2. 既存のproposalデータをmessageにコピー
UPDATE bids 
SET message = proposal 
WHERE message IS NULL AND proposal IS NOT NULL;

-- 3. インデックスを追加（必要に応じて）
CREATE INDEX IF NOT EXISTS idx_bids_message ON bids(message);

-- 4. 確認クエリ
SELECT 
    id,
    project_id,
    contractor_id,
    bid_amount,
    proposal,
    message,
    status,
    created_at
FROM bids 
WHERE proposal IS NOT NULL OR message IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;
