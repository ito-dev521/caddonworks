-- Storage bucket policies setup (Fixed encoding)
-- Setup access permissions for project-attachments bucket

-- 1. Drop existing policies
DO $$
BEGIN
    -- Drop existing policies
    DROP POLICY IF EXISTS "Users can upload project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Users can delete project attachments" ON storage.objects;
    DROP POLICY IF EXISTS "Public can view project attachments" ON storage.objects;

    RAISE NOTICE 'Existing storage policies dropped';
END
$$;

-- 2. Create new policies
DO $$
BEGIN
    -- Users can upload project attachments for related projects
    CREATE POLICY "Users can upload project attachments" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id::text = (storage.foldername(name))[2]
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );

    RAISE NOTICE 'Upload policy created';

    -- Users can view project attachments for related projects
    CREATE POLICY "Users can view project attachments" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id::text = (storage.foldername(name))[2]
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );

    RAISE NOTICE 'View policy created';

    -- Users can delete their own uploaded attachments
    CREATE POLICY "Users can delete project attachments" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'project-attachments' AND
        EXISTS (
          SELECT 1 FROM project_attachments pa
          JOIN users u ON pa.uploaded_by = u.id
          WHERE pa.file_path = name
          AND u.auth_user_id = auth.uid()
        )
      );

    RAISE NOTICE 'Delete policy created';

    -- Public access policy for contractors
    CREATE POLICY "Public can view project attachments" ON storage.objects
      FOR SELECT USING (
        bucket_id = 'project-attachments'
      );

    RAISE NOTICE 'Public view policy created';

    RAISE NOTICE 'All storage policies setup completed';
END
$$;

-- 3. Check bucket configuration
SELECT
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets
WHERE id = 'project-attachments';

-- 4. Check policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'objects'
    AND schemaname = 'storage'
    AND policyname LIKE '%project%';

-- 5. Test verification query
SELECT
    'Storage bucket exists' as status,
    CASE
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'project-attachments')
        THEN 'YES'
        ELSE 'NO'
    END as bucket_exists,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname LIKE '%project%')
        THEN 'YES'
        ELSE 'NO'
    END as policies_exist;