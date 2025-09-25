-- emergency_actions_log テーブルの安全な修正

-- 1. テーブル構造を確認
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'emergency_actions_log'
ORDER BY ordinal_position;

-- 2. テーブルが存在するかチェック
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_name = 'emergency_actions_log'
) as table_exists;

-- 3. 現在の制約を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'emergency_actions_log'::regclass
  AND contype = 'f'; -- 外部キー制約

-- 4. 既存データを確認（カラム名を動的に調整）
DO $$
DECLARE
  col_exists boolean;
BEGIN
  -- created_at カラムの存在確認
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_actions_log' AND column_name = 'created_at'
  ) INTO col_exists;

  IF col_exists THEN
    -- created_at が存在する場合
    RAISE NOTICE '=== emergency_actions_log の既存データ（created_at有り）===';
    FOR rec IN
      SELECT id, admin_user_id, action, created_at
      FROM emergency_actions_log
      WHERE admin_user_id NOT IN (SELECT id FROM users)
    LOOP
      RAISE NOTICE 'ID: %, admin_user_id: %, action: %, created_at: %',
        rec.id, rec.admin_user_id, rec.action, rec.created_at;
    END LOOP;
  ELSE
    -- created_at が存在しない場合
    RAISE NOTICE '=== emergency_actions_log の既存データ（created_at無し）===';
    FOR rec IN
      SELECT id, admin_user_id, action
      FROM emergency_actions_log
      WHERE admin_user_id NOT IN (SELECT id FROM users)
    LOOP
      RAISE NOTICE 'ID: %, admin_user_id: %, action: %',
        rec.id, rec.admin_user_id, rec.action;
    END LOOP;
  END IF;
END $$;

-- 5. 問題のあるレコードを削除
DELETE FROM emergency_actions_log
WHERE admin_user_id NOT IN (SELECT id FROM users);

-- 6. 既存の外部キー制約を削除
ALTER TABLE emergency_actions_log
DROP CONSTRAINT IF EXISTS emergency_actions_log_admin_user_id_fkey;

-- 7. admin_user_idをNULLABLEに変更
ALTER TABLE emergency_actions_log
ALTER COLUMN admin_user_id DROP NOT NULL;

-- 8. 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE emergency_actions_log
ADD CONSTRAINT emergency_actions_log_admin_user_id_fkey
FOREIGN KEY (admin_user_id)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 9. created_atカラムが存在しない場合は追加
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_actions_log' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE emergency_actions_log
    ADD COLUMN created_at TIMESTAMP DEFAULT NOW();

    RAISE NOTICE 'created_at カラムを追加しました';
  ELSE
    RAISE NOTICE 'created_at カラムは既に存在します';
  END IF;
END $$;

-- 10. 結果確認
SELECT 'emergency_actions_log 制約修正完了' as result;

-- 11. 修正後のテーブル構造を表示
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'emergency_actions_log'
ORDER BY ordinal_position;

-- 12. 新しい制約を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'emergency_actions_log'::regclass
  AND conname = 'emergency_actions_log_admin_user_id_fkey';