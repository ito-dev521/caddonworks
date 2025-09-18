# メンバーシップ問題の手動修正手順

## 問題
- 発注者（OrgAdmin）のメンバーシップが存在しない
- ユーザー一覧取得APIが403エラーで失敗

## 解決方法

### 1. Supabaseダッシュボードにアクセス
1. https://supabase.com/dashboard にアクセス
2. プロジェクトを選択
3. SQL Editorを開く

### 2. 以下のSQLを実行

```sql
-- 現在の状況を確認
SELECT 'Current users in auth.users:' as info;
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;

SELECT 'Current organizations:' as info;
SELECT id, name, domain FROM organizations ORDER BY created_at DESC LIMIT 5;

SELECT 'Current memberships:' as info;
SELECT user_id, org_id, role, created_at FROM memberships ORDER BY created_at DESC LIMIT 5;

-- 組織が存在しない場合は作成
INSERT INTO organizations (id, name, domain, created_at, updated_at)
SELECT 
  gen_random_uuid(),
  'Default Organization',
  'example.com',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM organizations LIMIT 1);

-- 認証ユーザーにメンバーシップが存在しない場合は作成
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

-- 認証ユーザーにusersテーブルのエントリが存在しない場合は作成
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
```

### 3. 確認
```sql
-- 修正後の状況を確認
SELECT 'After fix - memberships:' as info;
SELECT user_id, org_id, role, created_at FROM memberships ORDER BY created_at DESC LIMIT 5;

SELECT 'After fix - users table:' as info;
SELECT id, auth_user_id, email, display_name FROM users ORDER BY created_at DESC LIMIT 5;
```

### 4. アプリケーションを再テスト
1. ブラウザで設定ページを再読み込み
2. ユーザー一覧が正常に表示されることを確認

## 注意事項
- このSQLは既存のデータを上書きしません
- 安全に実行できます
- 複数回実行しても問題ありません
