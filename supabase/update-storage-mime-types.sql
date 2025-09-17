-- ストレージバケットのMIMEタイプ設定を更新
-- 動画ファイルのアップロードを許可する

-- 既存のattachmentsバケットのMIMEタイプ制限を更新
UPDATE storage.buckets 
SET file_size_limit = 314572800, -- 300MB (300 * 1024 * 1024)
    allowed_mime_types = ARRAY[
      -- 画像ファイル
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      -- 動画ファイル
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv',
      -- 文書ファイル
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-zip-compressed',
      -- CADファイル
      'application/dwg',
      'application/x-dwg',
      'application/acad',
      'application/x-acad',
      'application/step',
      'application/x-step',
      'application/iges',
      'application/x-iges',
      'application/octet-stream'
    ]
WHERE id = 'attachments';

-- バケットが存在しない場合は作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'attachments',
  'attachments', 
  false,
  314572800, -- 300MB
  ARRAY[
    -- 画像ファイル
    'image/jpeg',
    'image/png', 
    'image/gif',
    'image/webp',
    -- 動画ファイル
    'video/mp4',
    'video/avi',
    'video/mov',
    'video/wmv',
    'video/flv',
    'video/webm',
    'video/mkv',
    -- 文書ファイル
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-zip-compressed',
    -- CADファイル
    'application/dwg',
    'application/x-dwg',
    'application/acad',
    'application/x-acad',
    'application/step',
    'application/x-step',
    'application/iges',
    'application/x-iges',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ストレージポリシーを確認・更新
-- 認証されたユーザーがファイルをアップロードできるようにする
CREATE POLICY IF NOT EXISTS "認証されたユーザーはファイルをアップロードできる" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

-- 認証されたユーザーがファイルをダウンロードできるようにする
CREATE POLICY IF NOT EXISTS "認証されたユーザーはファイルをダウンロードできる" ON storage.objects
FOR SELECT USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);

-- 認証されたユーザーがファイルを削除できるようにする
CREATE POLICY IF NOT EXISTS "認証されたユーザーはファイルを削除できる" ON storage.objects
FOR DELETE USING (
  bucket_id = 'attachments' AND 
  auth.role() = 'authenticated'
);
