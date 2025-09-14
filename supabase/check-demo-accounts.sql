-- デモアカウントの確認スクリプト

-- 1. デモユーザーの確認
SELECT 
  u.id,
  u.email,
  u.display_name,
  u.created_at
FROM users u
WHERE u.email IN ('admin@demo.com', 'contractor@demo.com', 'reviewer@demo.com')
ORDER BY u.email;

-- 2. デモ組織の確認
SELECT 
  o.id,
  o.name,
  o.description,
  o.billing_email,
  o.active,
  o.created_at
FROM organizations o
WHERE o.name IN ('デモ建設株式会社', '個人事業主（受注者）')
ORDER BY o.name;

-- 3. デモメンバーシップの確認
SELECT 
  m.id,
  m.user_id,
  m.org_id,
  m.role,
  m.created_at,
  u.email as user_email,
  u.display_name as user_name,
  o.name as org_name
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE u.email IN ('admin@demo.com', 'contractor@demo.com', 'reviewer@demo.com')
ORDER BY u.email, m.role;

-- 4. 案件テーブルの確認
SELECT 
  p.id,
  p.title,
  p.status,
  p.org_id,
  o.name as org_name,
  p.created_at
FROM projects p
JOIN organizations o ON p.org_id = o.id
ORDER BY p.created_at DESC;

-- 5. テーブル構造の確認
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'organizations', 'memberships', 'projects')
ORDER BY table_name, ordinal_position;
