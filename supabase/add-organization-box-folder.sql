-- 組織テーブルにBOXフォルダIDカラムと承認状態管理カラムを追加
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS box_folder_id text,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 既存のactiveカラムのデフォルト値を変更（新規登録時は承認待ち）
ALTER TABLE public.organizations
ALTER COLUMN active SET DEFAULT false;

-- インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_organizations_box_folder_id ON public.organizations(box_folder_id);
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status ON public.organizations(approval_status);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(active);

-- コメントを追加
COMMENT ON COLUMN public.organizations.box_folder_id IS '組織専用のBOXフォルダID（会社フォルダ）';
COMMENT ON COLUMN public.organizations.approval_status IS '承認状態（pending: 承認待ち, approved: 承認済み, rejected: 却下）';
COMMENT ON COLUMN public.organizations.approved_at IS '承認日時';
COMMENT ON COLUMN public.organizations.approved_by IS '承認者（運営者のユーザーID）';
COMMENT ON COLUMN public.organizations.rejection_reason IS '却下理由';