-- usersテーブルに個人情報カラムを追加
DO $$ BEGIN
  -- 氏名
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'formal_name') THEN
    ALTER TABLE users ADD COLUMN formal_name TEXT;
  END IF;

  -- 郵便番号
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'postal_code') THEN
    ALTER TABLE users ADD COLUMN postal_code TEXT;
  END IF;

  -- 住所（自動入力）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address') THEN
    ALTER TABLE users ADD COLUMN address TEXT;
  END IF;

  -- 住所（その他）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'address_detail') THEN
    ALTER TABLE users ADD COLUMN address_detail TEXT;
  END IF;

  -- 電話番号
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'phone_number') THEN
    ALTER TABLE users ADD COLUMN phone_number TEXT;
  END IF;

  -- 会社番号（法人番号）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'company_number') THEN
    ALTER TABLE users ADD COLUMN company_number TEXT;
  END IF;

  -- インボイス番号（Tを除く）
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'registration_number') THEN
    ALTER TABLE users ADD COLUMN registration_number TEXT;
  END IF;

  -- 経験年数
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'experience_years') THEN
    ALTER TABLE users ADD COLUMN experience_years TEXT;
  END IF;
END $$;
