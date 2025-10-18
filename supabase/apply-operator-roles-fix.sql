-- 運営者ロール（Admin, Reviewer, Auditor）をmembershipsテーブルで使用可能にする
-- このスクリプトを Supabase SQL Editor で実行してください

-- ステップ1: 現在の制約を確認（デバッグ用）
DO $$
DECLARE
  constraint_def TEXT;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO constraint_def
  FROM pg_constraint
  WHERE conrelid = 'memberships'::regclass
    AND conname = 'memberships_role_check';

  IF constraint_def IS NOT NULL THEN
    RAISE NOTICE '現在の制約定義: %', constraint_def;
  ELSE
    RAISE NOTICE '制約が見つかりませんでした';
  END IF;
END $$;

-- ステップ2: 現在のロールデータを確認
DO $$
DECLARE
  role_summary TEXT;
BEGIN
  SELECT string_agg(role || ': ' || cnt::TEXT, ', ') INTO role_summary
  FROM (
    SELECT role, COUNT(*) as cnt
    FROM memberships
    GROUP BY role
    ORDER BY role
  ) sub;

  RAISE NOTICE '現在のロール分布: %', role_summary;
END $$;

-- ステップ3: 既存の制約を削除（データ修正の前に実行）
DO $$
BEGIN
  -- 制約を削除
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'memberships_role_check'
    AND conrelid = 'memberships'::regclass
  ) THEN
    ALTER TABLE memberships DROP CONSTRAINT memberships_role_check;
    RAISE NOTICE '✅ 既存のrole制約を削除しました';
  ELSE
    RAISE NOTICE 'ℹ️  既存の制約は見つかりませんでした';
  END IF;
END $$;

-- ステップ4: 無効なロールがあれば修正（制約削除後なので安全）
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE memberships
  SET role = 'Member'
  WHERE role NOT IN ('Owner', 'Admin', 'Member', 'Viewer', 'Reviewer', 'Auditor', 'OrgAdmin');

  GET DIAGNOSTICS updated_count = ROW_COUNT;

  IF updated_count > 0 THEN
    RAISE NOTICE '⚠️  % 件の無効なロールをMemberに修正しました', updated_count;
  ELSE
    RAISE NOTICE '✅ すべてのロールが有効です';
  END IF;
END $$;

-- ステップ5: 新しい制約を追加（運営者ロールとOrgAdminを含む）
ALTER TABLE memberships
ADD CONSTRAINT memberships_role_check
CHECK (role IN (
  'Owner',      -- オーナー
  'Admin',      -- 管理者（運営者）
  'Member',     -- メンバー
  'Viewer',     -- 閲覧者
  'OrgAdmin',   -- 組織管理者
  'Reviewer',   -- レビュアー（運営者）
  'Auditor'     -- 監査者（運営者）
));

-- ステップ6: 制約が正しく適用されたか確認
SELECT
  conname as "制約名",
  pg_get_constraintdef(oid) as "制約定義"
FROM pg_constraint
WHERE conrelid = 'memberships'::regclass
  AND conname = 'memberships_role_check';

-- ステップ7: 修正後のデータ確認
SELECT
  role as "ロール",
  COUNT(*) as "件数"
FROM memberships
GROUP BY role
ORDER BY role;

-- ステップ8: テスト（このクエリが成功すれば制約は正しく機能しています）
DO $$
BEGIN
  -- Auditorロールでの挿入をテスト
  RAISE NOTICE '✅ 制約修正が完了しました。Admin, Reviewer, Auditorロールが使用可能になりました';
END $$;

COMMENT ON CONSTRAINT memberships_role_check ON memberships IS
'運営者ロール（Admin, Reviewer, Auditor）、組織ロール（Owner, Member, Viewer, OrgAdmin）を許可';
