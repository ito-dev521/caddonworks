-- 簡略化されたStorageセットアップスクリプト

-- 1. project-attachmentsバケットを作成（存在しない場合のみ）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  false, -- プライベートバケット
  10485760, -- 10MB制限
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png'
  ]
) ON CONFLICT (id) DO NOTHING;

-- 2. 基本的なStorageポリシーを作成
-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view attachments from their organization" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload attachments to their organization projects" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete attachments from their organization projects" ON storage.objects;

-- 新しいポリシーを作成
CREATE POLICY "Users can manage project attachments" ON storage.objects
  FOR ALL USING (
    bucket_id = 'project-attachments' AND
    auth.uid() IS NOT NULL
  );
