-- プロジェクトステータスの型を確認するSQL

-- 1. プロジェクトテーブルの構造を確認
SELECT 
    column_name,
    data_type,
    udt_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name = 'status';

-- 2. カスタム型の存在確認
SELECT 
    typname as type_name,
    typtype as type_type,
    typcategory as type_category
FROM pg_type 
WHERE typname LIKE '%status%' OR typname LIKE '%project%';

-- 3. enum型の値一覧を確認
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%status%' OR t.typname LIKE '%project%'
ORDER BY t.typname, e.enumsortorder;
