-- シンプルなデータ確認

-- 1. ユーザー数確認
SELECT 'ユーザー数:' as info, COUNT(*) as count FROM public.users;

-- 2. 組織数確認
SELECT '組織数:' as info, COUNT(*) as count FROM public.organizations;

-- 3. メンバーシップ数確認
SELECT 'メンバーシップ数:' as info, COUNT(*) as count FROM public.memberships;

-- 4. 特定ユーザーの存在確認
SELECT 'ターゲットユーザー:' as info;
SELECT email, display_name FROM public.users WHERE email = 'caddon@ii-stylelab.com';

-- 5. 組織一覧
SELECT '組織一覧:' as info;
SELECT id, name FROM public.organizations LIMIT 5;

-- 6. メンバーシップの状況（ユーザーと組織の関連）
SELECT 'メンバーシップ状況:' as info;
SELECT COUNT(*) as total_memberships FROM public.memberships;