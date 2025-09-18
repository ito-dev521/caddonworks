-- メンバーシップ問題を修正するSQLスクリプト

-- 1. 現在の状況を確認
SELECT 'Current users in auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

SELECT 'Current organizations:' as info;
SELECT id, name, domain FROM organizations ORDER BY created_at DESC LIMIT 5;

SELECT 'Current memberships:' as info;
SELECT user_id, org_id, role, created_at FROM memberships ORDER BY created_at DESC LIMIT 5;

SELECT 'Current users in users table:' as info;
SELECT id, auth_user_id, email, display_name FROM users ORDER BY created_at DESC LIMIT 5;

-- 2. 組織が存在しない場合は作成
INSERT INTO organizations (id, name, domain, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Default Organization',
  'example.com',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- 3. 認証ユーザーにメンバーシップが存在しない場合は作成
INSERT INTO memberships (user_id, org_id, role, created_at, updated_at)
SELECT 
  au.id,
  o.id,
  'OrgAdmin',
  NOW(),
  NOW()
FROM auth.users au
CROSS JOIN (SELECT id FROM organizations LIMIT 1) o
WHERE NOT EXISTS (
  SELECT 1 FROM memberships m WHERE m.user_id = au.id
);

-- 4. 認証ユーザーにusersテーブルのエントリが存在しない場合は作成
INSERT INTO users (id, auth_user_id, email, display_name, created_at, updated_at)
SELECT 
  au.id,
  au.id,
  au.email,
  COALESCE(au.email, 'User')::text,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM users u WHERE u.auth_user_id = au.id
);

-- 5. 修正後の状況を確認
SELECT 'After fix - memberships:' as info;
SELECT user_id, org_id, role, created_at FROM memberships ORDER BY created_at DESC LIMIT 5;

SELECT 'After fix - users table:' as info;
SELECT id, auth_user_id, email, display_name FROM users ORDER BY created_at DESC LIMIT 5;
