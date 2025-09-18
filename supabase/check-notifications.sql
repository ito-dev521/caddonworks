-- 通知テーブルの状況を確認するSQL

-- 1. 通知テーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'notifications' 
ORDER BY ordinal_position;

-- 2. 業務完了届関連の通知を確認
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    created_at,
    data
FROM notifications 
WHERE type IN ('completion_report_created', 'invoice_issued', 'project_completed')
ORDER BY created_at DESC;

-- 3. 受注者ユーザーの通知を確認
SELECT 
    n.id,
    n.user_id,
    n.type,
    n.title,
    n.message,
    n.created_at,
    u.display_name,
    u.email
FROM notifications n
LEFT JOIN users u ON n.user_id = u.id
WHERE n.user_id IN (
    'fcf21fbd-60bf-4f3f-aede-d9d540704cd9', -- 受注者デモ
    '44d8bbed-e44d-43dc-9fc5-6d0464639c4e'  -- 受注者デモ2
)
ORDER BY n.created_at DESC;

-- 4. 全通知の確認（最新10件）
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
