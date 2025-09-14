-- Supabase Storageの設定スクリプト

-- 1. project-attachmentsバケットを作成
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

-- 2. Storageポリシーの作成
-- ユーザーは自分の組織の案件の添付資料のみアクセス可能
CREATE POLICY "Users can view attachments from their organization" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- ユーザーは自分の組織の案件に添付資料をアップロード可能
CREATE POLICY "Users can upload attachments to their organization projects" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );

-- ユーザーは自分の組織の案件の添付資料を削除可能
CREATE POLICY "Users can delete attachments from their organization projects" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments' AND
    (storage.foldername(name))[1] IN (
      SELECT p.id::text FROM projects p
      JOIN memberships m ON p.org_id = m.org_id
      WHERE m.user_id = auth.uid()
    )
  );
