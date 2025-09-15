-- Storageバケットのポリシー設定（安全版）
-- 既存のポリシーを安全に削除してから再作成

-- 1. 既存のポリシーを安全に削除
DO $$
BEGIN
    -- 既存のポリシーを削除（存在する場合のみ）
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can upload project attachments') THEN
        DROP POLICY "Users can upload project attachments" ON storage.objects;
        RAISE NOTICE 'ポリシー "Users can upload project attachments" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can view project attachments') THEN
        DROP POLICY "Users can view project attachments" ON storage.objects;
        RAISE NOTICE 'ポリシー "Users can view project attachments" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Users can delete project attachments') THEN
        DROP POLICY "Users can delete project attachments" ON storage.objects;
        RAISE NOTICE 'ポリシー "Users can delete project attachments" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view project attachments') THEN
        DROP POLICY "Public can view project attachments" ON storage.objects;
        RAISE NOTICE 'ポリシー "Public can view project attachments" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can upload') THEN
        DROP POLICY "Authenticated users can upload" ON storage.objects;
        RAISE NOTICE 'ポリシー "Authenticated users can upload" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can view') THEN
        DROP POLICY "Authenticated users can view" ON storage.objects;
        RAISE NOTICE 'ポリシー "Authenticated users can view" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Authenticated users can delete') THEN
        DROP POLICY "Authenticated users can delete" ON storage.objects;
        RAISE NOTICE 'ポリシー "Authenticated users can delete" を削除しました';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Public can view') THEN
        DROP POLICY "Public can view" ON storage.objects;
        RAISE NOTICE 'ポリシー "Public can view" を削除しました';
    END IF;
    
    RAISE NOTICE '既存のStorageポリシーを削除しました';
END
$$;

-- 2. 新しいポリシーを作成
DO $$
BEGIN
    -- 認証されたユーザーはアップロード可能
    CREATE POLICY "Authenticated users can upload" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE 'ポリシー "Authenticated users can upload" を作成しました';

    -- 認証されたユーザーは閲覧可能
    CREATE POLICY "Authenticated users can view" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE 'ポリシー "Authenticated users can view" を作成しました';

    -- 認証されたユーザーは削除可能
    CREATE POLICY "Authenticated users can delete" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'project-attachments' AND
        auth.role() = 'authenticated'
      );
    RAISE NOTICE 'ポリシー "Authenticated users can delete" を作成しました';

    -- パブリックアクセス（受注者向け）
    CREATE POLICY "Public can view" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments'
      );
    RAISE NOTICE 'ポリシー "Public can view" を作成しました';
    
    RAISE NOTICE 'すべてのStorageポリシーの設定が完了しました';
END
$$;

-- 3. 確認
SELECT 
    'Storage policies created successfully' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (policyname LIKE '%project%' OR policyname LIKE '%Authenticated%' OR policyname LIKE '%Public%');

-- 4. 現在のポリシー一覧
SELECT 
    policyname,
    cmd,
    permissive,
    roles
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND (policyname LIKE '%project%' OR policyname LIKE '%Authenticated%' OR policyname LIKE '%Public%')
ORDER BY policyname;
