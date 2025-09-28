-- ユーザーのメンバーシップとロール情報を確認

-- 1. ユーザー情報の確認
SELECT 'ユーザー情報:' as info;
SELECT
    id,
    auth_user_id,
    email,
    display_name,
    created_at
FROM public.users
WHERE email = 'caddon@ii-stylelab.com';

-- 2. 組織情報の確認
SELECT '組織情報:' as info;
SELECT
    id,
    name,
    created_at
FROM public.organizations;

-- 3. メンバーシップ情報の確認（これが削除されている可能性）
SELECT 'メンバーシップ情報:' as info;
SELECT
    m.*,
    u.email as user_email,
    o.name as org_name
FROM public.memberships m
LEFT JOIN public.users u ON m.user_id = u.id
LEFT JOIN public.organizations o ON m.organization_id = o.id
WHERE u.email = 'caddon@ii-stylelab.com';

-- 4. 全体のカウント確認
SELECT 'データ数確認:' as info;
SELECT
    (SELECT COUNT(*) FROM public.users) as users_count,
    (SELECT COUNT(*) FROM public.organizations) as organizations_count,
    (SELECT COUNT(*) FROM public.memberships) as memberships_count,
    (SELECT COUNT(*) FROM public.projects) as projects_count;