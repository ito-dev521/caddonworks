-- StorageバケットのMIMEタイプを更新
-- CADファイル形式（dwg, p21, sfc, bfo）を追加

-- 1. 既存のバケットのMIMEタイプを更新
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed',
    -- CADファイル形式
    'application/dwg',
    'application/x-dwg',
    'image/vnd.dwg',
    'application/step',
    'application/step+zip',
    'application/octet-stream', -- p21, sfc, bfoなどのバイナリファイル
    'application/x-step',
    'application/x-sfc',
    'application/x-bfo'
]
WHERE id = 'project-attachments';

-- 2. 更新結果を確認
SELECT 
    'Bucket MIME Types Updated' as status,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'project-attachments';

-- 3. 新しいバケットを作成する場合（既存バケットがない場合）
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
SELECT 
    'project-attachments',
    'project-attachments',
    true,
    209715200, -- 200MB
    ARRAY[
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-rar-compressed',
        -- CADファイル形式
        'application/dwg',
        'application/x-dwg',
        'image/vnd.dwg',
        'application/step',
        'application/step+zip',
        'application/octet-stream', -- p21, sfc, bfoなどのバイナリファイル
        'application/x-step',
        'application/x-sfc',
        'application/x-bfo'
    ]
WHERE NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-attachments');

-- 4. ポリシーが存在しない場合は作成
DO $$
BEGIN
    -- アップロードポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_attachments_upload') THEN
        CREATE POLICY "project_attachments_upload" ON storage.objects
          FOR INSERT WITH CHECK (
            bucket_id = 'project-attachments' AND
            auth.role() = 'authenticated'
          );
        RAISE NOTICE 'アップロードポリシーを作成しました';
    END IF;

    -- 閲覧ポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_attachments_view') THEN
        CREATE POLICY "project_attachments_view" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'project-attachments' AND
            auth.role() = 'authenticated'
          );
        RAISE NOTICE '閲覧ポリシーを作成しました';
    END IF;

    -- 削除ポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_attachments_delete') THEN
        CREATE POLICY "project_attachments_delete" ON storage.objects
          FOR DELETE USING (
            bucket_id = 'project-attachments' AND
            auth.role() = 'authenticated'
          );
        RAISE NOTICE '削除ポリシーを作成しました';
    END IF;

    -- パブリック閲覧ポリシー
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'project_attachments_public_view') THEN
        CREATE POLICY "project_attachments_public_view" ON storage.objects
          FOR SELECT USING (
            bucket_id = 'project-attachments'
          );
        RAISE NOTICE 'パブリック閲覧ポリシーを作成しました';
    END IF;
    
    RAISE NOTICE 'すべてのStorageポリシーの設定が完了しました';
END
$$;

-- 5. 最終確認
SELECT 
    'Final Status' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-attachments') 
        THEN 'Bucket exists' 
        ELSE 'Bucket does not exist' 
    END as bucket_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE 'project_attachments_%') 
        THEN 'Policies exist' 
        ELSE 'No policies found' 
    END as policy_status;
