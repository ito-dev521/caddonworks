-- Box権限管理エラーの完全な修正
-- このSQLスクリプトを Supabase Dashboard の SQL Editor で実行してください

-- 1. organizations テーブルに status カラムを追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';

-- 2. emergency_actions_log テーブルの修正
-- 問題のあるレコード（存在しないユーザーを参照）を削除
DELETE FROM emergency_actions_log
WHERE admin_user_id IS NOT NULL
  AND admin_user_id NOT IN (SELECT id FROM users);

-- 3. 外部キー制約を削除して再作成
ALTER TABLE emergency_actions_log
DROP CONSTRAINT IF EXISTS emergency_actions_log_admin_user_id_fkey;

-- 4. admin_user_id を NULLABLE に変更
ALTER TABLE emergency_actions_log
ALTER COLUMN admin_user_id DROP NOT NULL;

-- 5. created_at カラムを追加（存在しない場合）
ALTER TABLE emergency_actions_log
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- 6. 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE emergency_actions_log
ADD CONSTRAINT emergency_actions_log_admin_user_id_fkey
FOREIGN KEY (admin_user_id)
REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 7. 結果確認
SELECT 'Box permissions database fixes applied successfully' as result;