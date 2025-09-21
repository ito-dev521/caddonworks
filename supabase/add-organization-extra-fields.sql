-- organizationsテーブル 追加フィールド（存在しない場合のみ）
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE organizations ADD COLUMN postal_code TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'department'
  ) THEN
    ALTER TABLE organizations ADD COLUMN department TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'position'
  ) THEN
    ALTER TABLE organizations ADD COLUMN position TEXT;
  END IF;
END $$;

-- Webサイト列がない場合は追加
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'organizations' AND column_name = 'website'
  ) THEN
    ALTER TABLE organizations ADD COLUMN website TEXT;
  END IF;
END $$;


