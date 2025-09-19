-- 通知テーブルの制約の詳細を確認するSQL

-- 1. 通知テーブルの現在のtype値一覧
SELECT DISTINCT type, COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY type;

-- 2. 通知テーブルの制約の完全な定義を取得
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c';

-- 3. 制約の詳細をテキスト形式で表示
SELECT 
    'Current constraint definition:' as info,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c'
AND conname = 'notifications_type_check';
