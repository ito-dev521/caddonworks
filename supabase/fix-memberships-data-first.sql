-- memberships テーブルのデータを先に修正してから制約を適用

-- 1. 現在のロールデータを確認
SELECT
  role,
  COUNT(*) as count
FROM memberships
GROUP BY role
ORDER BY role;

-- 2. 無効なロールを有効なロールに修正
UPDATE memberships
SET role = 'Admin'
WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor');

-- 3. 修正後の確認
SELECT
  role,
  COUNT(*) as count
FROM memberships
GROUP BY role
ORDER BY role;

-- 4. 既存の制約を削除（存在する場合）
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'memberships_role_check'
    AND conrelid = 'memberships'::regclass
  ) THEN
    ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
    RAISE NOTICE '既存のrole制約を削除しました';
  END IF;
END $$;

-- 5. 新しい制約を追加
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN (
  'Owner', 'Admin', 'Member', 'Viewer',  -- 通常の組織ロール
  'Reviewer', 'Auditor'                   -- 運営者ロール
));

-- 6. 最終確認
SELECT 'memberships制約修正完了' as result;

-- 7. 制約の内容を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'memberships'::regclass
  AND conname = 'memberships_role_check';