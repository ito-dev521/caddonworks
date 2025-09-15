-- Storageバケットのポリシーをリセット（完全版）
-- 既存のポリシーを全て削除してから新しく作成

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

-- 2. 新しいポリシーを作成
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

-- 3. 確認
SELECT 
    'Storage policies reset successfully' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE 'project_attachments_%';

-- 4. 現在のポリシー一覧
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
