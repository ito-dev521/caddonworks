-- 組織を承認待ち状態に戻すSQL
-- テスト用：イースタイルラボ株式会社を承認待ち状態にリセット

UPDATE organizations
SET
    approval_status = 'pending',
    approved_at = NULL,
    active = false,
    box_folder_id = NULL,
    rejection_reason = NULL
WHERE name = 'イースタイルラボ株式会社';

-- 確認用：更新された組織の状態を表示
SELECT
    id,
    name,
    approval_status,
    approved_at,
    active,
    box_folder_id,
    created_at
FROM organizations
WHERE name = 'イースタイルラボ株式会社';