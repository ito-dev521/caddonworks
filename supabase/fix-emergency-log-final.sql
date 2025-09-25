-- emergency_actions_log テーブルの修正（構文エラー修正版）

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

-- 4. 既存データを確認（シンプル版）
SELECT
  'Problem records count' as info,
  COUNT(*) as count
FROM emergency_actions_log
WHERE admin_user_id NOT IN (SELECT id FROM users);

-- 5. created_at カラムの存在確認
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'emergency_actions_log' AND column_name = 'created_at'
    ) THEN 'created_at カラムは存在します'
    ELSE 'created_at カラムは存在しません'
  END as created_at_status;

-- 6. 問題のあるレコードを削除
DELETE FROM emergency_actions_log
WHERE admin_user_id NOT IN (SELECT id FROM users);

-- 7. 既存の外部キー制約を削除
ALTER TABLE emergency_actions_log
DROP CONSTRAINT IF EXISTS emergency_actions_log_admin_user_id_fkey;

-- 8. admin_user_idをNULLABLEに変更
ALTER TABLE emergency_actions_log
ALTER COLUMN admin_user_id DROP NOT NULL;

-- 9. 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE emergency_actions_log
ADD CONSTRAINT emergency_actions_log_admin_user_id_fkey
FOREIGN KEY (admin_user_id)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 10. created_atカラムが存在しない場合は追加
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

-- 11. updated_atカラムも追加（存在しない場合）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'emergency_actions_log' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE emergency_actions_log
    ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

    RAISE NOTICE 'updated_at カラムを追加しました';
  ELSE
    RAISE NOTICE 'updated_at カラムは既に存在します';
  END IF;
END $$;

-- 12. 結果確認
SELECT 'emergency_actions_log 制約修正完了' as result;

-- 13. 修正後のテーブル構造を表示
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'emergency_actions_log'
ORDER BY ordinal_position;

-- 14. 新しい制約を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'emergency_actions_log'::regclass
  AND conname = 'emergency_actions_log_admin_user_id_fkey';

-- 15. レコード数確認
SELECT
  'Total records' as info,
  COUNT(*) as count
FROM emergency_actions_log;