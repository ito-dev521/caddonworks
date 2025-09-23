-- kanri@ii-style.comユーザーのメンバーシップを直接作成
INSERT INTO memberships (user_id, org_id, role)
VALUES (
  '2918f5b0-25d3-46a4-992d-29d984c46f48',  -- ユーザーID
  '07d63199-9f02-434c-92c2-a27958a66397',  -- 組織ID (イースタイルラボ株式会社)
  'Staff'                                   -- 権限
)
ON CONFLICT (user_id, org_id) DO UPDATE SET
  role = EXCLUDED.role,
  updated_at = NOW();

-- 確認用クエリ
SELECT
  u.email,
  u.display_name,
  m.role,
  o.name as organization_name
FROM users u
JOIN memberships m ON u.id = m.user_id
JOIN organizations o ON m.org_id = o.id
WHERE u.email = 'kanri@ii-style.com';