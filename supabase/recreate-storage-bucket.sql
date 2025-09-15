-- Storageバケットの完全再作成
-- project-attachmentsバケットを削除してから再作成

-- 1. 既存のポリシーを全て削除
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- project-attachmentsに関連するポリシーを全て削除
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
            AND schemaname = 'storage'
            AND (policyname LIKE '%project%' 
                 OR policyname LIKE '%Authenticated%' 
                 OR policyname LIKE '%Public%')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'ポリシー "%" を削除しました', policy_record.policyname;
    END LOOP;
    
    RAISE NOTICE '既存のStorageポリシーを全て削除しました';
END
$$;

-- 2. 既存のバケットを削除（存在する場合）
DO $$
BEGIN
    -- バケット内のファイルを削除
    DELETE FROM storage.objects WHERE bucket_id = 'project-attachments';
    RAISE NOTICE 'バケット内のファイルを削除しました';
    
    -- バケットを削除
    DELETE FROM storage.buckets WHERE id = 'project-attachments';
    RAISE NOTICE 'バケット "project-attachments" を削除しました';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'バケット削除中にエラーが発生しました: %', SQLERRM;
END
$$;

-- 3. 新しいバケットを作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-attachments',
    'project-attachments',
    true,
    209715200, -- 200MB
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed'
    ]
);

-- 4. 新しいポリシーを作成
DO $$
BEGIN
    -- 認証されたユーザーはアップロード可能
    CREATE POLICY "project_attachments_upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE 'アップロードポリシーを作成しました';

    -- 認証されたユーザーは閲覧可能
    CREATE POLICY "project_attachments_view" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE '閲覧ポリシーを作成しました';

    -- 認証されたユーザーは削除可能
    CREATE POLICY "project_attachments_delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE '削除ポリシーを作成しました';

    -- パブリックアクセス（受注者向け）
    CREATE POLICY "project_attachments_public_view" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments'
      );
    RAISE NOTICE 'パブリック閲覧ポリシーを作成しました';
    
    RAISE NOTICE 'すべてのStorageポリシーの設定が完了しました';
END
$$;

-- 5. 確認
SELECT 
    'Bucket Recreation Complete' as status,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'project-attachments';

-- 6. ポリシー確認
SELECT 
    'Policies Created' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE 'project_attachments_%';

-- 7. 現在のポリシー一覧
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE 'project_attachments_%'
ORDER BY policyname;
