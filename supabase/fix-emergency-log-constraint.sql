-- emergency_actions_log テーブルの外部キー制約を修正

-- 1. 現在の制約と問題を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'emergency_actions_log'::regclass
  AND contype = 'f'; -- 外部キー制約

-- 2. 問題のあるレコードを確認
SELECT
  id,
  admin_user_id,
  action,
  created_at
FROM emergency_actions_log
WHERE admin_user_id NOT IN (SELECT id FROM users);

-- 3. 問題のあるレコードを削除
DELETE FROM emergency_actions_log
WHERE admin_user_id NOT IN (SELECT id FROM users);

-- 4. 既存の外部キー制約を削除して再作成（より柔軟に）
ALTER TABLE emergency_actions_log
DROP CONSTRAINT IF EXISTS emergency_actions_log_admin_user_id_fkey;

-- 5. 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE emergency_actions_log
ADD CONSTRAINT emergency_actions_log_admin_user_id_fkey
FOREIGN KEY (admin_user_id)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 6. admin_user_idをNULLABLEに変更（必要な場合）
ALTER TABLE emergency_actions_log
ALTER COLUMN admin_user_id DROP NOT NULL;

-- 7. 結果確認
SELECT 'emergency_actions_log 制約修正完了' as result;

-- 8. 新しい制約を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'emergency_actions_log'::regclass
  AND conname = 'emergency_actions_log_admin_user_id_fkey';