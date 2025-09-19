-- projectsテーブルのstatus制約を確認するSQL

-- 1. projectsテーブルの制約情報
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'projects'::regclass 
AND contype = 'c';

-- 2. projectsテーブルの現在のstatus値
SELECT DISTINCT status, COUNT(*) as count
FROM projects 
GROUP BY status
ORDER BY status;
