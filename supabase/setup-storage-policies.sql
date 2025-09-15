-- Storageバケットのポリシー設定
-- project-attachmentsバケットのアクセス権限を設定

-- 1. 既存のポリシーを削除
DO $$
BEGIN
    -- 既存のポリシーを削除
    DROP POLICY IF EXISTS "Users can upload project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view project attachments" ON storage.objects;
    
    RAISE NOTICE '既存のStorageポリシーを削除しました';
END
$$;

-- 2. 新しいポリシーを作成
DO $$
BEGIN
    -- ユーザーは関連する案件の添付資料をアップロード可能
    CREATE POLICY "Users can upload project attachments" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id::text = (storage.foldername(name))[2]
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );
    
    RAISE NOTICE 'アップロードポリシーを作成しました';

    -- ユーザーは関連する案件の添付資料を閲覧可能
    CREATE POLICY "Users can view project attachments" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id::text = (storage.foldername(name))[2]
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );
    
    RAISE NOTICE '閲覧ポリシーを作成しました';

    -- ユーザーは自分がアップロードした添付資料を削除可能
    CREATE POLICY "Users can delete project attachments" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM project_attachments pa
          JOIN users u ON pa.uploaded_by = u.id
          WHERE pa.file_path = name
          AND u.auth_user_id = auth.uid()
        )
      );
    
    RAISE NOTICE '削除ポリシーを作成しました';

    -- パブリックアクセス用のポリシー（受注者向け）
    CREATE POLICY "Public can view project attachments" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments'
      );
    
    RAISE NOTICE 'パブリック閲覧ポリシーを作成しました';
    
    RAISE NOTICE 'すべてのStorageポリシーの設定が完了しました';
END
$$;

-- 3. バケットの設定確認
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'project-attachments';

-- 4. ポリシーの確認
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%project%';

-- 5. テスト用の確認クエリ
SELECT 
    'Storage bucket exists' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-attachments') 
        THEN 'YES' 
        ELSE 'NO' 
    END as bucket_exists,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%project%') 
        THEN 'YES' 
        ELSE 'NO' 
    END as policies_exist;
