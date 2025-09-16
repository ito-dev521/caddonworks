-- アバター用ストレージバケットのポリシー設定

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow authenticated users to upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own avatars" ON storage.objects;

-- 認証済みユーザーがアバターをアップロード可能
CREATE POLICY "Allow authenticated users to upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);

-- 認証済みユーザーがアバターを閲覧可能
CREATE POLICY "Allow authenticated users to view avatars" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);

-- 認証済みユーザーがアバターを削除可能
CREATE POLICY "Allow users to delete their own avatars" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'avatars'
);

