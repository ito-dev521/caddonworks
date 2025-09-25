-- memberships テーブルの制約問題を修正

-- 1. 現在の制約を確認
SELECT
  conname,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'memberships'::regclass
  AND conname LIKE '%role%';

-- 2. 既存の role check 制約を削除（存在する場合）
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

-- 3. 正しいrole制約を追加
-- 運営者用のロール（Admin, Reviewer, Auditor）と通常のメンバーシップロールを許可
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN (
  'Owner', 'Admin', 'Member', 'Viewer',  -- 通常の組織ロール
  'Reviewer', 'Auditor'                   -- 運営者ロール（Adminは重複だが問題なし）
));

-- 4. 現在のmembershipsデータを確認
SELECT
  role,
  COUNT(*) as count
FROM memberships
GROUP BY role
ORDER BY role;

-- 5. 無効なロールがある場合の対処法を表示
DO $$
DECLARE
  invalid_roles TEXT[];
BEGIN
  SELECT ARRAY_AGG(DISTINCT role) INTO invalid_roles
  FROM memberships
  WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor');

  IF array_length(invalid_roles, 1) > 0 THEN
    RAISE NOTICE '無効なロールが見つかりました: %', invalid_roles;
    RAISE NOTICE '以下のSQLで修正してください:';
    RAISE NOTICE 'UPDATE memberships SET role = ''Member'' WHERE role NOT IN (''Owner'', ''Admin'', ''Member'', ''Viewer'', ''Reviewer'', ''Auditor'');';
  ELSE
    RAISE NOTICE '全てのロールが有効です';
  END IF;
END $$;

COMMENT ON CONSTRAINT memberships_role_check ON memberships IS
'運営者ロール（Admin, Reviewer, Auditor）と通常組織ロール（Owner, Admin, Member, Viewer）を許可';