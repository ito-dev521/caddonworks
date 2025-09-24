-- 優先招待候補を保持するカラムを追加
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'priority_invitation_candidate_id'
    ) THEN
        ALTER TABLE projects
        ADD COLUMN priority_invitation_candidate_id UUID NULL REFERENCES users(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_projects_priority_invitation_candidate
          ON projects(priority_invitation_candidate_id);
    END IF;
END $$;

-- 備考: 既存の add-priority-invitation-status.sql で priority_invitation ステータスと
-- priority_invitation_active フラグが追加されています。本ファイルは候補者IDの保持のみを行います。

