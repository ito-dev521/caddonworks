-- ファイルストレージとproject_attachmentsテーブルのセットアップ

-- 1. project_attachmentsテーブルの作成
CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  uploaded_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 外部キー制約の追加
DO $$
BEGIN
    -- projectsテーブルへの外部キー
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE project_attachments DROP CONSTRAINT IF EXISTS fk_project_attachments_project_id;
        EXCEPTION
            WHEN undefined_object THEN
                NULL;
        END;
        
        BEGIN
            ALTER TABLE project_attachments ADD CONSTRAINT fk_project_attachments_project_id 
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END;
    END IF;

    -- usersテーブルへの外部キー
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        BEGIN
            ALTER TABLE project_attachments DROP CONSTRAINT IF EXISTS fk_project_attachments_uploaded_by;
        EXCEPTION
            WHEN undefined_object THEN
                NULL;
        END;
        
        BEGIN
            ALTER TABLE project_attachments ADD CONSTRAINT fk_project_attachments_uploaded_by 
                FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;
        EXCEPTION
            WHEN duplicate_object THEN
                NULL;
        END;
    END IF;
END
$$;

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by ON project_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_attachments_created_at ON project_attachments(created_at);

-- 4. RLSポリシーの設定
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view project attachments" ON project_attachments;
    DROP POLICY IF EXISTS "Users can insert project attachments" ON project_attachments;
    DROP POLICY IF EXISTS "Users can delete project attachments" ON project_attachments;
END
$$;

-- 新しいポリシーを作成
DO $$
BEGIN
    -- ユーザーは関連する案件の添付資料を閲覧可能
    CREATE POLICY "Users can view project attachments" ON project_attachments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id = project_attachments.project_id
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );

    -- ユーザーは関連する案件に添付資料を追加可能
    CREATE POLICY "Users can insert project attachments" ON project_attachments
      FOR INSERT WITH CHECK (
        EXISTS (
          SELECT 1 FROM projects p
          JOIN memberships m ON p.org_id = m.org_id
          WHERE p.id = project_attachments.project_id
          AND m.user_id = (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        )
      );

    -- ユーザーは自分がアップロードした添付資料を削除可能
    CREATE POLICY "Users can delete project attachments" ON project_attachments
      FOR DELETE USING (
        uploaded_by = (
          SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
      );
    
    RAISE NOTICE 'project_attachmentsテーブルのポリシーを作成しました';
END
$$;

-- 5. Storageバケットの作成（手動でSupabaseダッシュボードで実行する必要があります）
-- 以下のコマンドをSupabaseダッシュボードのSQLエディタで実行してください：
/*
-- Storageバケットの作成
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'project-attachments',
  'project-attachments',
  true,
  209715200, -- 200MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
);

-- Storageバケットのポリシー
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
*/

-- 6. 確認用クエリ
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_attachments' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 既存データの確認
SELECT 
    id,
    project_id,
    file_name,
    file_size,
    file_type,
    uploaded_by,
    created_at
FROM project_attachments 
ORDER BY created_at DESC 
LIMIT 5;
