-- 通知テーブルのtype制約を更新して会員レベル関連の通知タイプを追加
DO $$
BEGIN
    -- 既存の制約を削除
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

    -- 新しい制約を追加（会員レベル関連を含む）
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
        'project_suspended',
        'evaluation_received',
        'evaluation_completed',
        'completion_report_created',
        'invoice_created',
        'invoice_issued',
        'payment_received',
        'project_ready_for_evaluation',
        'priority_invitation',
        'priority_invitation_response',
        'project_approval_requested',
        'project_approved',
        'project_rejected',
        'member_level_change_request',  -- 会員レベル変更申請通知
        'member_level_change_approved',  -- 会員レベル変更承認通知
        'member_level_change_rejected'   -- 会員レベル変更却下通知
    ));
END
$$;

-- コメントの更新
COMMENT ON COLUMN notifications.type IS '通知タイプ: bid_received, bid_accepted, bid_rejected, contract_created, contract_signed, contract_signed_by_org, contract_declined, project_completed, project_suspended, evaluation_received, evaluation_completed, completion_report_created, invoice_created, invoice_issued, payment_received, project_ready_for_evaluation, priority_invitation, priority_invitation_response, project_approval_requested, project_approved, project_rejected, member_level_change_request, member_level_change_approved, member_level_change_rejected';
