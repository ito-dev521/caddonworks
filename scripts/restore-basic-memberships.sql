-- 基本的なメンバーシップデータを復旧

-- 1. 先にユーザーと組織の情報を確認
SELECT 'ユーザー情報確認:' as info;
SELECT id, email, display_name FROM users WHERE email = 'caddon@ii-stylelab.com';

SELECT '組織情報確認:' as info;
SELECT id, name FROM organizations LIMIT 5;

-- 2. メンバーシップテーブルの構造確認
SELECT 'メンバーシップテーブル構造:' as info;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'memberships'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. ユーザーを最初の組織にOrgAdminとして追加
-- (実際の値は上記の確認結果を見てから手動で実行)
/*
INSERT INTO memberships (user_id, organization_id, role, created_at, updated_at)
SELECT
    u.id as user_id,
    o.id as organization_id,
    'OrgAdmin' as role,
    NOW() as created_at,
    NOW() as updated_at
FROM users u, organizations o
WHERE u.email = 'caddon@ii-stylelab.com'
AND o.id = (SELECT id FROM organizations LIMIT 1)
AND NOT EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = u.id AND m.organization_id = o.id
);
*/

-- 確認用：メンバーシップが正常に作成されたかチェック
-- SELECT 'メンバーシップ確認:' as info;
-- SELECT m.*, u.email, o.name
-- FROM memberships m
-- JOIN users u ON m.user_id = u.id
-- JOIN organizations o ON m.organization_id = o.id;