-- memberships.role のチェック制約を更新して 'Staff' を許可する
-- 既存名: memberships_role_check

ALTER TABLE public.memberships
  DROP CONSTRAINT IF EXISTS memberships_role_check;

ALTER TABLE public.memberships
  ADD CONSTRAINT memberships_role_check
  CHECK (role IN ('OrgAdmin', 'Staff', 'Contractor'));

-- 必要に応じて追加する場合（コメントアウト）
-- CHECK (role IN ('OrgAdmin', 'Staff', 'Contractor', 'Reviewer', 'Auditor'));


