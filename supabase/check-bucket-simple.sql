-- Storageバケットの状態確認（簡易版）
-- PostgreSQL互換性を考慮したシンプルな確認スクリプト

-- 1. バケットの存在確認
SELECT 
    'Bucket Status' as check_type,
    id,
    name,
    public,
    file_size_limit,
    created_at
FROM storage.buckets 
WHERE id = 'project-attachments';

-- 2. 全てのバケット一覧
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
    permissive
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (policyname LIKE '%project%' OR policyname LIKE '%Authenticated%' OR policyname LIKE '%Public%')
ORDER BY policyname;

-- 4. バケットが存在しない場合の確認
SELECT 
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-attachments') 
        THEN 'Bucket exists' 
        ELSE 'Bucket does not exist' 
    END as bucket_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%project%') 
        THEN 'Policies exist' 
        ELSE 'No policies found' 
    END as policy_status;
