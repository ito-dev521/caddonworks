-- projectsテーブルのRLSポリシーを修正するスクリプト

-- 1. 既存のRLSポリシーを削除
DROP POLICY IF EXISTS "Enable read access for all users" ON projects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON projects;
DROP POLICY IF EXISTS "Enable update for users based on email" ON projects;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON projects;
DROP POLICY IF EXISTS "Allow OrgAdmin to manage projects" ON projects;
DROP POLICY IF EXISTS "Allow users to view their organization's projects" ON projects;
DROP POLICY IF EXISTS "Allow OrgAdmin to insert projects" ON projects;
DROP POLICY IF EXISTS "Allow OrgAdmin to update projects" ON projects;
DROP POLICY IF EXISTS "Allow OrgAdmin to delete projects" ON projects;

-- 2. projectsテーブルのRLSを一時的に無効化
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 3. 新しいRLSポリシーを作成
-- OrgAdminは自分の組織の案件をすべて操作可能
CREATE POLICY "OrgAdmin can manage their organization's projects"
ON projects FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()::text::uuid
    AND m.org_id = projects.org_id
    AND m.role = 'OrgAdmin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()::text::uuid
    AND m.org_id = projects.org_id
    AND m.role = 'OrgAdmin'
  )
);

-- Contractorは割り当てられた案件を閲覧可能
CREATE POLICY "Contractor can view assigned projects"
ON projects FOR SELECT
TO authenticated
USING (
  contractor_id = auth.uid()::text::uuid
  OR
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()::text::uuid
    AND m.org_id = projects.org_id
    AND m.role IN ('OrgAdmin', 'Reviewer')
  )
);

-- Reviewerは自分の組織の案件を閲覧可能
CREATE POLICY "Reviewer can view their organization's projects"
ON projects FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.user_id = auth.uid()::text::uuid
    AND m.org_id = projects.org_id
    AND m.role = 'Reviewer'
  )
);

-- 4. RLSを有効化
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 5. 現在のRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname;

-- 6. テスト用のデモデータが正しく作成されているか確認
SELECT '=== デモユーザー ===' as info;
SELECT id, email, display_name FROM users WHERE email LIKE '%@demo.com' ORDER BY email;

SELECT '=== デモメンバーシップ ===' as info;
SELECT 
  m.role,
  u.email as user_email,
  o.name as org_name
FROM memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.org_id = o.id
WHERE u.email LIKE '%@demo.com'
ORDER BY u.email, m.role;

SELECT '=== 既存の案件 ===' as info;
SELECT 
  p.id,
  p.title,
  p.status,
  o.name as org_name
FROM projects p
JOIN organizations o ON p.org_id = o.id
ORDER BY p.created_at DESC;
