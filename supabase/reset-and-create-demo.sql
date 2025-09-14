-- デモアカウントの完全リセットと再作成スクリプト

-- 1. 既存のデモデータを削除
-- 案件データを削除
DELETE FROM projects WHERE org_id IN (
  SELECT id FROM organizations WHERE name IN ('デモ建設株式会社', '個人事業主（受注者）')
);

-- メンバーシップを削除
DELETE FROM memberships WHERE user_id IN (
  SELECT id FROM users WHERE email IN ('admin@demo.com', 'contractor@demo.com', 'reviewer@demo.com')
);

-- 組織を削除
DELETE FROM organizations WHERE name IN ('デモ建設株式会社', '個人事業主（受注者）');

-- ユーザーを削除
DELETE FROM users WHERE email IN ('admin@demo.com', 'contractor@demo.com', 'reviewer@demo.com');

-- 2. デモ組織を作成
INSERT INTO organizations (id, name, description, billing_email, system_fee, active, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'デモ建設株式会社', 'デモ用の建設会社', 'admin@demo.com', 0, true, NOW(), NOW()),
  (gen_random_uuid(), '個人事業主（受注者）', '受注者用のダミー組織', 'contractor@demo.com', 0, true, NOW(), NOW());

-- 3. デモユーザーを作成
INSERT INTO users (id, auth_user_id, display_name, email, specialties, qualifications, created_at, updated_at)
VALUES 
  (gen_random_uuid(), gen_random_uuid(), '管理者デモ', 'admin@demo.com', ARRAY['建設管理'], ARRAY['一級建築士'], NOW(), NOW()),
  (gen_random_uuid(), gen_random_uuid(), '受注者デモ', 'contractor@demo.com', ARRAY['道路設計', '橋梁設計'], ARRAY['技術士（建設部門）', '一級建築士'], NOW(), NOW()),
  (gen_random_uuid(), gen_random_uuid(), '監督員デモ', 'reviewer@demo.com', ARRAY['品質管理'], ARRAY['技術士（建設部門）'], NOW(), NOW());

-- 4. デモメンバーシップを作成
INSERT INTO memberships (id, org_id, user_id, role, created_at)
SELECT 
  gen_random_uuid(),
  o.id,
  u.id,
  CASE 
    WHEN u.email = 'admin@demo.com' THEN 'OrgAdmin'
    WHEN u.email = 'contractor@demo.com' THEN 'Contractor'
    WHEN u.email = 'reviewer@demo.com' THEN 'Reviewer'
  END,
  NOW()
FROM organizations o, users u
WHERE o.name = 'デモ建設株式会社' 
  AND u.email IN ('admin@demo.com', 'reviewer@demo.com')
UNION ALL
SELECT 
  gen_random_uuid(),
  o.id,
  u.id,
  'Contractor',
  NOW()
FROM organizations o, users u
WHERE o.name = '個人事業主（受注者）' 
  AND u.email = 'contractor@demo.com';

-- 5. テスト案件を作成
INSERT INTO projects (id, title, description, budget, start_date, end_date, category, status, org_id, contractor_id, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  '道路拡張工事',
  '主要道路の拡張工事プロジェクト',
  5000000,
  '2024-01-15',
  '2024-06-30',
  '道路設計',
  'in_progress',
  o.id,
  u.id,
  NOW(),
  NOW()
FROM organizations o, users u
WHERE o.name = 'デモ建設株式会社' AND u.email = 'contractor@demo.com'
UNION ALL
SELECT 
  gen_random_uuid(),
  '橋梁補修工事',
  '老朽化した橋梁の補修工事',
  3000000,
  '2024-02-01',
  '2024-08-31',
  '橋梁設計',
  'bidding',
  o.id,
  NULL,
  NOW(),
  NOW()
FROM organizations o
WHERE o.name = 'デモ建設株式会社'
UNION ALL
SELECT 
  gen_random_uuid(),
  '下水道整備工事',
  '新規下水道管の敷設工事',
  8000000,
  '2024-03-01',
  '2024-12-31',
  '下水道設計',
  'bidding',
  o.id,
  NULL,
  NOW(),
  NOW()
FROM organizations o
WHERE o.name = 'デモ建設株式会社';

-- 6. 結果を確認
SELECT '=== デモユーザー ===' as info;
SELECT id, email, display_name, created_at FROM users WHERE email LIKE '%@demo.com' ORDER BY email;

SELECT '=== デモ組織 ===' as info;
SELECT id, name, description, billing_email, active FROM organizations WHERE name IN ('デモ建設株式会社', '個人事業主（受注者）') ORDER BY name;

SELECT '=== デモメンバーシップ ===' as info;
SELECT 
  m.id,
  m.role,
  u.email as user_email,
  u.display_name as user_name,
  o.name as org_name
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE u.email LIKE '%@demo.com'
ORDER BY u.email, m.role;

SELECT '=== テスト案件 ===' as info;
SELECT 
  p.id,
  p.title,
  p.status,
  p.budget,
  o.name as org_name,
  u.display_name as contractor_name
FROM projects p
JOIN organizations o ON p.org_id = o.id
LEFT JOIN users u ON p.contractor_id = u.id
ORDER BY p.created_at DESC;
