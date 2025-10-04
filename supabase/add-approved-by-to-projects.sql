-- projectsテーブルにapproved_byカラムを追加して、案件を承認した管理者のIDを保存する

DO $$
BEGIN
    -- approved_byカラムが存在しない場合のみ追加
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'approved_by'
    ) THEN
        ALTER TABLE projects
        ADD COLUMN approved_by UUID REFERENCES users(id);

        COMMENT ON COLUMN projects.approved_by IS '案件を承認した管理者のID';
    END IF;
END
$$;
