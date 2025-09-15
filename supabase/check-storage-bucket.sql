-- Storageバケットの状態確認
-- project-attachmentsバケットの存在と設定を確認

-- 1. バケットの存在確認
SELECT 
    'Bucket Status Check' as check_type,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'project-attachments';

-- 2. バケットが存在しない場合の確認
SELECT 
    'All Buckets' as check_type,
    id,
    name,
    public,
    file_size_limit
FROM storage.buckets 
ORDER BY created_at DESC;

-- 3. 現在のポリシー確認
SELECT 
    'Current Policies' as check_type,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (policyname LIKE '%project%' OR policyname LIKE '%Authenticated%' OR policyname LIKE '%Public%')
ORDER BY policyname;

-- 4. Storageテーブルの権限確認
SELECT 
    'Storage Table Permissions' as check_type,
    table_name,
    privilege_type,
    grantee
FROM information_schema.table_privileges 
WHERE table_schema = 'storage' 
    AND table_name = 'objects'
ORDER BY grantee, privilege_type;

-- 5. RLSの状態確認
SELECT 
    'RLS Status' as check_type,
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
    AND tablename = 'objects';
