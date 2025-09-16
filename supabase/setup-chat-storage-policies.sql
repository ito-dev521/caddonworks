-- チャット添付資料用ストレージバケットのポリシー設定

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to view chat files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete chat files" ON storage.objects;

-- 認証済みユーザーがチャット添付ファイルをアップロード可能
CREATE POLICY "Allow authenticated users to upload chat files" ON storage.objects
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = 'chat-attachments'
);

-- 認証済みユーザーがチャット添付ファイルを閲覧可能
CREATE POLICY "Allow authenticated users to view chat files" ON storage.objects
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = 'chat-attachments'
);

-- 認証済みユーザーがチャット添付ファイルを削除可能
CREATE POLICY "Allow authenticated users to delete chat files" ON storage.objects
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  bucket_id = 'attachments' AND
  (storage.foldername(name))[1] = 'chat-attachments'
);
