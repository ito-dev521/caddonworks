-- プロジェクト添付ファイル用のストレージバケットを作成（既存の場合はスキップ）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  false, -- プライベートバケット
  209715200, -- 200MB (200 * 1024 * 1024)
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/zip',
    'application/x-rar-compressed',
    'application/x-rar',
    'application/octet-stream', -- DWG, P21, SFC, BFO などのバイナリファイル
    'text/plain'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ストレージポリシーを設定
-- プロジェクトの参加者のみがファイルをアップロード・閲覧可能
CREATE POLICY "プロジェクト参加者はファイルをアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      JOIN projects p ON m.org_id = p.org_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "プロジェクト参加者はファイルを閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      JOIN projects p ON m.org_id = p.org_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "プロジェクト参加者はファイルを削除可能" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN memberships m ON u.id = m.user_id
      JOIN projects p ON m.org_id = p.org_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );

-- 受注者もファイルをアップロード・閲覧可能
CREATE POLICY "受注者はファイルをアップロード可能" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN projects p ON u.id = p.contractor_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "受注者はファイルを閲覧可能" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN projects p ON u.id = p.contractor_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );

CREATE POLICY "受注者はファイルを削除可能" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'project-attachments'
    AND auth.uid() IN (
      SELECT u.auth_user_id 
      FROM users u
      JOIN projects p ON u.id = p.contractor_id
      WHERE p.id = (storage.foldername(name))[1]::uuid
    )
  );
