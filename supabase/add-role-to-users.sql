-- usersテーブルにroleカラムを追加
DO $$ BEGIN
  -- roleカラム
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'Contractor';
  END IF;
END $$;













































