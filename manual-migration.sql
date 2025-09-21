-- 組織テーブルにBOXフォルダIDカラムと承認状態管理カラムを追加
-- Supabaseダッシュボードの SQL Editor で実行してください

-- 1. 新しいカラムを追加
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS box_folder_id text,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 2. approval_statusの制約を追加
ALTER TABLE public.organizations
ADD CONSTRAINT organizations_approval_status_check
CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- 3. 既存データを承認済みに設定
UPDATE public.organizations
SET
  approval_status = 'approved',
  approved_at = created_at
WHERE approval_status IS NULL OR approved_at IS NULL;

-- 4. 作成済みBOXフォルダIDを設定
UPDATE public.organizations SET box_folder_id = '342185697254' WHERE name = 'ケセラセラ株式会社';
UPDATE public.organizations SET box_folder_id = '342185072606' WHERE name = '個人事業主（受注者）';
UPDATE public.organizations SET box_folder_id = '342185963899' WHERE name = 'デフォルト組織';
UPDATE public.organizations SET box_folder_id = '342185178024' WHERE name = 'イースタイルラボ株式会社';
UPDATE public.organizations SET box_folder_id = '342186008529' WHERE name = 'デモコンサルタント株式会社';
UPDATE public.organizations SET box_folder_id = '342186043191' WHERE name = 'デモ建設株式会社';

-- 5. インデックスを追加（検索性能向上）
CREATE INDEX IF NOT EXISTS idx_organizations_box_folder_id ON public.organizations(box_folder_id);
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status ON public.organizations(approval_status);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(active);

-- 6. カラムにコメントを追加
COMMENT ON COLUMN public.organizations.box_folder_id IS '組織専用のBOXフォルダID（会社フォルダ）';
COMMENT ON COLUMN public.organizations.approval_status IS '承認状態（pending: 承認待ち, approved: 承認済み, rejected: 却下）';
COMMENT ON COLUMN public.organizations.approved_at IS '承認日時';
COMMENT ON COLUMN public.organizations.approved_by IS '承認者（運営者のユーザーID）';
COMMENT ON COLUMN public.organizations.rejection_reason IS '却下理由';

-- 7. 結果確認
SELECT
  name,
  approval_status,
  CASE
    WHEN box_folder_id IS NOT NULL THEN 'BOX連携済み'
    ELSE 'BOX未連携'
  END as box_status,
  active,
  created_at,
  approved_at
FROM public.organizations
ORDER BY created_at DESC;