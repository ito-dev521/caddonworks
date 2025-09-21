-- usersテーブルに部署(department)列を追加（存在しない場合のみ）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'department'
  ) THEN
    ALTER TABLE users ADD COLUMN department TEXT;
  END IF;
END $$;


