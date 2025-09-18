-- 入札テーブルの構造とデータを確認

-- 1. テーブル構造の確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
ORDER BY ordinal_position;

-- 2. 入札データの確認（最新5件）
SELECT 
    id,
    project_id,
    contractor_id,
    bid_amount,
    proposal,
    status,
    created_at
FROM bids 
ORDER BY created_at DESC 
LIMIT 5;

-- 3. 入札データの統計
SELECT 
    COUNT(*) as total_bids,
    COUNT(proposal) as proposals_with_content,
    COUNT(CASE WHEN proposal IS NOT NULL AND proposal != '' THEN 1 END) as non_empty_proposals
FROM bids;
