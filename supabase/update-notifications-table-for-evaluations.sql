-- 通知テーブルに評価関連の通知タイプを追加

-- 1. 既存の制約を削除
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 2. 新しい制約を追加（評価関連の通知タイプを含む）
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'bid_received', 
  'bid_accepted', 
  'bid_rejected', 
  'contract_created', 
  'contract_signed', 
  'project_completed',
  'evaluation_received',
  'invoice_created'
));

-- 3. 既存の通知データを確認
SELECT type, COUNT(*) as count 
FROM notifications 
GROUP BY type 
ORDER BY type;
