-- 通知テーブルのtype制約を更新して'project_suspended'を追加
DO $$
BEGIN
    -- 既存の制約を削除
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- 新しい制約を追加（既存のデータも含む）
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
        'project_suspended',  -- 新規追加
        'evaluation_received',
        'evaluation_completed',
        'completion_report_created',
        'invoice_created',
        'invoice_issued',
        'payment_received'
    ));
END
$$;

-- コメントの更新
COMMENT ON COLUMN notifications.type IS '通知タイプ: bid_received, bid_accepted, bid_rejected, contract_created, contract_signed, contract_signed_by_org, contract_declined, project_completed, project_suspended, evaluation_received, evaluation_completed, completion_report_created, invoice_created, invoice_issued, payment_received';
