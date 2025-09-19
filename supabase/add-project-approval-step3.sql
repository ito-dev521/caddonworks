-- ステップ3: 通知タイプに承認関連を追加
DO $$ 
BEGIN
    -- 既存の制約を削除
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- 新しい制約を追加（既存の値 + 新しい承認関連の値）
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        -- 既存の値
        'bid_received',
        'bid_accepted', 
        'bid_rejected',
        'contract_created',
        'contract_signed',
        'contract_signed_by_org',
        'contract_declined',
        'project_completed',
        'project_suspended',
        'evaluation_received',
        'evaluation_completed',
        'completion_report_created',
        'invoice_created',
        'invoice_issued',
        'payment_received',
        -- 新しく追加する承認関連の値
        'project_approval_requested',
        'project_approved',
        'project_rejected'
    ));
END $$;
