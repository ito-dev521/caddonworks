-- 運営者権限の整理：受注者を運営者から除外し、正しい運営組織のみに運営者権限を付与

-- 1. 現在の状況を確認
SELECT
  m.id,
  m.role,
  u.email,
  u.display_name,
  o.name as org_name,
  o.id as org_id
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE m.role IN ('Admin', 'Reviewer', 'Auditor')
ORDER BY o.name, m.role;

-- 2. 運営会社組織を確認/作成
DO $$
DECLARE
  operator_org_id UUID;
BEGIN
  -- 運営会社組織を取得
  SELECT id INTO operator_org_id
  FROM organizations
  WHERE name = '運営会社'
  LIMIT 1;

  -- 存在しない場合は作成
  IF operator_org_id IS NULL THEN
    INSERT INTO organizations (name, email, status, billing_email, created_at, updated_at)
    VALUES (
      '運営会社',
      'admin@caddon.jp',
      'approved',
      'admin@caddon.jp',
      NOW(),
      NOW()
    )
    RETURNING id INTO operator_org_id;

    RAISE NOTICE '運営会社組織を作成しました: %', operator_org_id;
  ELSE
    RAISE NOTICE '運営会社組織が見つかりました: %', operator_org_id;
  END IF;
END $$;

-- 3. 受注者の誤った運営者権限を削除
-- support@ii-stylelab.com のみを運営者として残し、他は削除
DELETE FROM memberships
WHERE role IN ('Admin', 'Reviewer', 'Auditor')
  AND user_id IN (
    SELECT u.id
    FROM users u
    WHERE u.email != 'support@ii-stylelab.com'
      AND u.email != 'admin@caddon.jp'
  );

-- 4. support@ii-stylelab.com を正しい運営組織の Auditor として設定
DO $$
DECLARE
  support_user_id UUID;
  operator_org_id UUID;
BEGIN
  -- support ユーザーID取得
  SELECT id INTO support_user_id
  FROM users
  WHERE email = 'support@ii-stylelab.com'
  LIMIT 1;

  -- 運営組織ID取得
  SELECT id INTO operator_org_id
  FROM organizations
  WHERE name = '運営会社'
  LIMIT 1;

  IF support_user_id IS NOT NULL AND operator_org_id IS NOT NULL THEN
    -- 既存の運営者権限を削除
    DELETE FROM memberships
    WHERE user_id = support_user_id
      AND role IN ('Admin', 'Reviewer', 'Auditor');

    -- 正しい運営者権限を追加
    INSERT INTO memberships (user_id, org_id, role, created_at)
    VALUES (support_user_id, operator_org_id, 'Auditor', NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'support@ii-stylelab.com を運営組織の Auditor として設定しました';
  ELSE
    RAISE NOTICE 'ユーザーまたは組織が見つかりません: user_id=%, org_id=%', support_user_id, operator_org_id;
  END IF;
END $$;

-- 5. 修正後の運営者一覧を確認
SELECT
  m.id,
  m.role,
  u.email,
  u.display_name,
  o.name as org_name
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE m.role IN ('Admin', 'Reviewer', 'Auditor')
ORDER BY o.name, m.role;

-- 6. 一般ユーザーが Member ロールを持っているか確認
SELECT
  COUNT(*) as member_count,
  o.name as org_name
FROM memberships m
JOIN organizations o ON m.org_id = o.id
WHERE m.role = 'Member'
GROUP BY o.name;

SELECT '運営者権限の整理が完了しました' as result;