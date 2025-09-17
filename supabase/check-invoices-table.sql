-- invoicesテーブルの構造と中身を確認するSQL

-- 1. テーブル構造を確認
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;

-- 2. テーブルの制約を確認
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'invoices';

-- 3. 既存のデータを確認（最初の5件）
SELECT * FROM invoices LIMIT 5;

-- 4. データ件数を確認
SELECT COUNT(*) as total_invoices FROM invoices;

-- 5. 各カラムのNULL値の数を確認（存在するカラムのみ）
-- まず、実際に存在するカラムを確認してから実行
SELECT 
    COUNT(*) as total_rows
FROM invoices;

-- 6. 実際のテーブル構造を確認（より安全な方法）
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;

-- 7. テーブルの作成文を確認（PostgreSQLの場合）
SELECT 
    'CREATE TABLE invoices (' || 
    string_agg(
        column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || COALESCE(character_maximum_length::text, '') || ')'
            WHEN data_type = 'timestamp with time zone' THEN 'TIMESTAMPTZ'
            WHEN data_type = 'timestamp without time zone' THEN 'TIMESTAMP'
            WHEN data_type = 'numeric' THEN 'NUMERIC'
            WHEN data_type = 'uuid' THEN 'UUID'
            WHEN data_type = 'text' THEN 'TEXT'
            WHEN data_type = 'jsonb' THEN 'JSONB'
            ELSE data_type
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ', ' ORDER BY ordinal_position
    ) || ');' as create_statement
FROM information_schema.columns 
WHERE table_name = 'invoices';
