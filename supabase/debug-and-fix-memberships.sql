-- memberships テーブルの問題を詳細調査して修正

-- 1. 全ての既存データを詳細表示
SELECT
  id,
  user_id,
  org_id,
  role,
  created_at
FROM memberships
ORDER BY created_at DESC;

-- 2. 無効なロールを持つレコードを特定
SELECT
  id,
  user_id,
  org_id,
  role,
  'INVALID' as status
FROM memberships
WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor');

-- 3. 空文字や NULL のロールをチェック
SELECT
  id,
  user_id,
  org_id,
  role,
  CASE
    WHEN role IS NULL THEN 'NULL_ROLE'
    WHEN role = '' THEN 'EMPTY_ROLE'
    WHEN LENGTH(TRIM(role)) = 0 THEN 'WHITESPACE_ROLE'
    ELSE 'OTHER_ISSUE'
  END as issue_type
FROM memberships
WHERE role IS NULL
   OR role = ''
   OR LENGTH(TRIM(role)) = 0
   OR role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor');

-- 4. 既存の制約を完全に削除
ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_role_check;

-- 5. 問題のあるデータをすべて修正
-- NULL や空文字のロールを Admin に設定
UPDATE memberships
SET role = 'Admin'
WHERE role IS NULL
   OR role = ''
   OR LENGTH(TRIM(role)) = 0;

-- 6. 無効なロール名をすべて Admin に修正
UPDATE memberships
SET role = 'Admin'
WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor');

-- 7. 修正後のデータを確認
SELECT
  role,
  COUNT(*) as count
FROM memberships
GROUP BY role
ORDER BY role;

-- 8. すべてのデータが有効であることを確認
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM memberships
      WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor')
    ) THEN '無効なロールが残っています'
    ELSE 'すべてのロールが有効です'
  END as validation_result;

-- 9. 新しい制約を追加
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor'));

-- 10. 制約が正常に追加されたことを確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'memberships'::regclass
  AND conname = 'memberships_role_check';

-- 11. 最終確認メッセージ
SELECT 'memberships テーブルの修正が完了しました' as result;