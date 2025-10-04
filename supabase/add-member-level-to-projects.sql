-- projectsテーブルに会員レベルフィールドを追加
DO $$ BEGIN
  -- 必要な会員レベル
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'required_level') THEN
    ALTER TABLE projects ADD COLUMN required_level TEXT DEFAULT 'beginner';
  END IF;
END $$;

































