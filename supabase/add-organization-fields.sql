-- organizationsテーブルに法人情報フィールドを追加
DO $$ BEGIN
  -- 事業種別
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'business_type') THEN
    ALTER TABLE organizations ADD COLUMN business_type TEXT;
  END IF;

  -- 法人番号
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'registration_number') THEN
    ALTER TABLE organizations ADD COLUMN registration_number TEXT;
  END IF;


  -- 従業員数
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'employee_count') THEN
    ALTER TABLE organizations ADD COLUMN employee_count INTEGER;
  END IF;

  -- 住所
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address') THEN
    ALTER TABLE organizations ADD COLUMN address TEXT;
  END IF;

  -- 電話番号
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'phone') THEN
    ALTER TABLE organizations ADD COLUMN phone TEXT;
  END IF;

  -- メールアドレス
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'email') THEN
    ALTER TABLE organizations ADD COLUMN email TEXT;
  END IF;

  -- ウェブサイト
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'website') THEN
    ALTER TABLE organizations ADD COLUMN website TEXT;
  END IF;

  -- 担当者名
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'contact_person') THEN
    ALTER TABLE organizations ADD COLUMN contact_person TEXT;
  END IF;
END $$;
