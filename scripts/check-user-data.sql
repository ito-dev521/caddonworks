-- ユーザーデータの確認スクリプト

-- 1. auth.users テーブルの確認
SELECT 'auth.users テーブル:' as table_info;
SELECT
    id,
    email,
    created_at,
    email_confirmed_at
FROM auth.users
WHERE email = 'caddon@ii-stylelab.com'
LIMIT 5;

-- 2. public.users テーブルの確認
SELECT 'public.users テーブル:' as table_info;
SELECT
    id,
    auth_user_id,
    email,
    display_name,
    created_at
FROM public.users
WHERE email = 'caddon@ii-stylelab.com'
LIMIT 5;

-- 3. organizations テーブルの確認
SELECT 'public.organizations テーブル:' as table_info;
SELECT
    id,
    name,
    type,
    created_at
FROM public.organizations
LIMIT 5;

-- 4. 全体のユーザー数確認
SELECT 'ユーザー数確認:' as info;
SELECT
    (SELECT COUNT(*) FROM auth.users) as auth_users_count,
    (SELECT COUNT(*) FROM public.users) as public_users_count,
    (SELECT COUNT(*) FROM public.organizations) as organizations_count;