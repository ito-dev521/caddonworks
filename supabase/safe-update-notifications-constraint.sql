-- 通知テーブルの制約を安全に更新

-- 1. まず既存の通知データのtype値を確認
SELECT DISTINCT type, COUNT(*) as count
FROM notifications
GROUP BY type
ORDER BY type;

-- 2. 既存の制約を削除
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. 新しい制約を追加（既存のデータも含む）
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
  'evaluation_completed',
  'completion_report_created',
  'invoice_created',
  'invoice_issued',
  'payment_received'
));

-- 4. コメントの追加
COMMENT ON COLUMN notifications.type IS '通知タイプ: bid_received, bid_accepted, bid_rejected, contract_created, contract_signed, contract_signed_by_org, contract_declined, project_completed, evaluation_received, evaluation_completed, completion_report_created, invoice_created, invoice_issued, payment_received';
