-- 通知テーブルの制約を安全に更新（データクリーンアップ版）

-- 1. 既存の通知データのtype値を確認
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY type;

-- 2. 無効なtype値を持つ通知を削除（必要に応じて）
-- 注意: この操作は既存の通知データを削除します
-- DELETE FROM notifications 
-- WHERE type NOT IN (
--   'bid_received', 
--   'bid_accepted', 
--   'bid_rejected', 
--   'contract_created', 
--   'contract_signed', 
--   'contract_signed_by_org',
--   'contract_declined',
--   'project_completed',
--   'evaluation_received',
--   'invoice_created',
--   'invoice_issued',
--   'payment_received'
-- );

-- 3. 既存の制約を削除
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 4. 新しい制約を追加
ALTER TABLE notifications 
ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'bid_received', 
  'bid_accepted', 
  'bid_rejected', 
  'contract_created', 
  'contract_signed', 
  'contract_signed_by_org',
  'contract_declined',
  'project_completed',
  'evaluation_received',
  'invoice_created',
  'invoice_issued',
  'payment_received'
));

-- 5. コメントの追加
COMMENT ON COLUMN notifications.type IS '通知タイプ: bid_received, bid_accepted, bid_rejected, contract_created, contract_signed, contract_signed_by_org, contract_declined, project_completed, evaluation_received, invoice_created, invoice_issued, payment_received';
