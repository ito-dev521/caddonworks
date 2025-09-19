-- 通知テーブルのtype制約を更新（contract_declinedを追加）

-- 既存の制約を削除
ALTER TABLE notifications 
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 新しい制約を追加（contract_declinedを含む）
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
  'project_completed'
));

-- コメントの追加
COMMENT ON COLUMN notifications.type IS '通知タイプ: bid_received, bid_accepted, bid_rejected, contract_created, contract_signed, contract_signed_by_org, contract_declined, project_completed';
