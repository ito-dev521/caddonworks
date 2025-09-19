-- プロジェクトテーブルの構造を確認するSQL

-- 1. プロジェクトテーブルの全カラム情報
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects' 
ORDER BY ordinal_position;

-- 2. プロジェクトテーブルのstatusカラムの詳細
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name = 'status';

-- 3. プロジェクトテーブルの現在のデータサンプル（statusカラムの値）
SELECT DISTINCT status, COUNT(*) as count
FROM projects 
GROUP BY status
ORDER BY status;
