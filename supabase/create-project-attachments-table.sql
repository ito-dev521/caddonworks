-- プロジェクト添付ファイルテーブルを作成
CREATE TABLE IF NOT EXISTS project_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type VARCHAR(100),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_project_attachments_project_id ON project_attachments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_attachments_uploaded_by ON project_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_project_attachments_created_at ON project_attachments(created_at);

-- RLSポリシーを設定
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;

-- プロジェクト参加者は添付ファイルを閲覧可能
CREATE POLICY "プロジェクト参加者は添付ファイルを閲覧可能" ON project_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_attachments.project_id
      AND (
        p.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
        OR p.contractor_id = auth.uid()
      )
    )
  );

-- プロジェクト参加者は添付ファイルをアップロード可能
CREATE POLICY "プロジェクト参加者は添付ファイルをアップロード可能" ON project_attachments
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_attachments.project_id
      AND (
        p.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
        OR p.contractor_id = auth.uid()
      )
    )
  );

-- プロジェクト参加者は自分の添付ファイルを削除可能
CREATE POLICY "プロジェクト参加者は自分の添付ファイルを削除可能" ON project_attachments
  FOR DELETE USING (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = project_attachments.project_id
      AND (
        p.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
        OR p.contractor_id = auth.uid()
      )
    )
  );

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_project_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_attachments_updated_at
  BEFORE UPDATE ON project_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_project_attachments_updated_at();
