-- Storageバケットのポリシー設定（簡易版）
-- まずは基本的なアクセスを許可

-- 1. 既存のポリシーを削除
DROP POLICY IF EXISTS "Users can upload project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can view project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete project attachments" ON storage.objects;
DROP POLICY IF EXISTS "Public can view project attachments" ON storage.objects;

-- 2. シンプルなポリシーを作成
-- 認証されたユーザーはアップロード可能
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments' AND
    auth.role() = 'authenticated'
  );

-- 認証されたユーザーは閲覧可能
CREATE POLICY "Authenticated users can view" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments' AND
    auth.role() = 'authenticated'
  );

-- 認証されたユーザーは削除可能
CREATE POLICY "Authenticated users can delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments' AND
    auth.role() = 'authenticated'
  );

-- パブリックアクセス（受注者向け）
CREATE POLICY "Public can view" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments'
  );

-- 3. 確認
SELECT 
    'Storage policies created' as status,
    COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename = 'objects' 
    AND schemaname = 'storage'
    AND policyname LIKE '%project%' OR policyname LIKE '%Authenticated%' OR policyname LIKE '%Public%';
