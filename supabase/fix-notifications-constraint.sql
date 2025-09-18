-- 通知テーブルの制約を確認し、completion_report_createdを追加

-- 1. 現在の制約を確認
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c';

-- 2. 既存のnotifications_type_check制約を削除
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- 3. 新しい制約を追加（completion_report_createdを含む）
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'bid_received',
    'bid_accepted', 
    'bid_rejected',
    'contract_created',
    'contract_signed',
    'project_completed',
    'evaluation_received',
    'evaluation_completed',
    'completion_report_created',
    'invoice_issued',
    'invoice_paid',
    'message_received',
    'priority_invitation_received',
    'priority_invitation_accepted',
    'priority_invitation_declined'
));

-- 4. 制約が正しく追加されたか確認
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c'
AND conname = 'notifications_type_check';
