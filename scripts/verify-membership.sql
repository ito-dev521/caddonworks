-- メンバーシップが正しく作成されたか確認

-- 1. メンバーシップの確認
SELECT 'メンバーシップ確認:' as info;
SELECT * FROM memberships;

-- 2. カラム名の再確認（organization_id vs org_id）
SELECT 'membershipsテーブル構造:' as info;
\d memberships;

-- 3. ユーザーとメンバーシップの結合確認
SELECT 'ユーザー・メンバーシップ結合:' as info;
SELECT
    u.id as user_id,
    u.email,
    m.role,
    COALESCE(m.org_id, m.organization_id) as org_id
FROM users u
LEFT JOIN memberships m ON u.id = m.user_id
WHERE u.email = 'caddon@ii-stylelab.com';