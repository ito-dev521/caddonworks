-- メンバーシップデータを復旧

-- 1. 必要な情報を取得
WITH user_info AS (
    SELECT id as user_id, email
    FROM users
    WHERE email = 'caddon@ii-stylelab.com'
),
org_info AS (
    SELECT id as org_id, name
    FROM organizations
    LIMIT 1
)
-- 2. メンバーシップを挿入
INSERT INTO memberships (user_id, org_id, role, created_at)
SELECT
    u.user_id,
    o.org_id,
    'OrgAdmin',
    NOW()
FROM user_info u, org_info o
WHERE NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = u.user_id AND m.org_id = o.org_id
);

-- 3. 結果確認
SELECT 'メンバーシップ復旧完了:' as status;
SELECT
    m.id,
    m.role,
    u.email,
    o.name as organization_name
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE u.email = 'caddon@ii-stylelab.com';

-- 4. 総数確認
SELECT 'メンバーシップ総数:' as info, COUNT(*) as count FROM memberships;