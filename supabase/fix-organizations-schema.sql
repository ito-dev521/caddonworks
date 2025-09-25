-- organizations テーブルのステータスカラム追加

-- 1. statusカラムを追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'status'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN status VARCHAR DEFAULT 'pending';

    -- 既存の組織データにデフォルト値を設定
    UPDATE organizations SET status = 'approved' WHERE status IS NULL;

    -- NOT NULL制約を追加
    ALTER TABLE organizations ALTER COLUMN status SET NOT NULL;

    COMMENT ON COLUMN organizations.status IS 'pending: 承認待ち, approved: 承認済み, suspended: 利用停止, rejected: 却下';

    RAISE NOTICE 'organizations テーブルにstatusカラムを追加しました';
  ELSE
    RAISE NOTICE 'organizations テーブルのstatusカラムは既に存在します';
  END IF;
END $$;

-- 2. billing_emailカラムも確認して追加（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'billing_email'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN billing_email VARCHAR;

    -- 既存データのemailをbilling_emailにコピー
    UPDATE organizations SET billing_email = email WHERE billing_email IS NULL;

    COMMENT ON COLUMN organizations.billing_email IS '請求書送付先メールアドレス';

    RAISE NOTICE 'organizations テーブルにbilling_emailカラムを追加しました';
  ELSE
    RAISE NOTICE 'organizations テーブルのbilling_emailカラムは既に存在します';
  END IF;
END $$;

-- 3. その他の必要なカラムも確認
DO $$
BEGIN
  -- created_atカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

    RAISE NOTICE 'organizations テーブルにcreated_atカラムを追加しました';
  END IF;

  -- updated_atカラム
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE organizations
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

    RAISE NOTICE 'organizations テーブルにupdated_atカラムを追加しました';
  END IF;
END $$;

-- 4. インデックス追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_organizations_status'
  ) THEN
    CREATE INDEX idx_organizations_status ON organizations(status);
    RAISE NOTICE 'organizations.status用のインデックスを作成しました';
  END IF;
END $$;

-- 実行確認
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'organizations'
ORDER BY ordinal_position;