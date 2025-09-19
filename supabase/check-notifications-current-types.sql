-- 通知テーブルの現在のtype値を確認するSQL

-- 1. 通知テーブルの現在のtype値一覧
SELECT DISTINCT type, COUNT(*) as count
FROM notifications 
GROUP BY type
ORDER BY type;

-- 2. 通知テーブルの制約情報
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'notifications'::regclass 
AND contype = 'c';
