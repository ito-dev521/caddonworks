-- 業務完了届テーブル作成
CREATE TABLE IF NOT EXISTS completion_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  report_number VARCHAR(50) UNIQUE,
  submission_date DATE DEFAULT CURRENT_DATE,
  actual_completion_date DATE NOT NULL,

  -- ステータス管理
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- デジタル署名情報
  box_sign_request_id VARCHAR,
  contractor_signed_at TIMESTAMP WITH TIME ZONE,
  org_signed_at TIMESTAMP WITH TIME ZONE,
  approved_at TIMESTAMP WITH TIME ZONE,

  -- 署名済み完了届のBox file ID
  signed_document_id VARCHAR,

  -- メタデータ
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- 制約：1つのプロジェクトに対して1つの完了届のみ
  UNIQUE(project_id)
);

-- RLSを有効化
ALTER TABLE completion_reports ENABLE ROW LEVEL SECURITY;

-- 受注者は自分の完了届を管理可能
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'completion_reports'
        AND policyname = 'contractors_manage_completion_reports'
    ) THEN
        CREATE POLICY "contractors_manage_completion_reports" ON completion_reports
          FOR ALL USING (
            contractor_id IN (
              SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
          );
    END IF;
END
$$;

-- 発注者は自分の組織の完了届を閲覧・承認可能
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'completion_reports'
        AND policyname = 'org_admins_view_completion_reports'
    ) THEN
        CREATE POLICY "org_admins_view_completion_reports" ON completion_reports
          FOR ALL USING (
            org_id IN (
              SELECT m.org_id FROM memberships m
              JOIN users u ON u.id = m.user_id
              WHERE u.auth_user_id = auth.uid() AND (m.role = 'OrgAdmin' OR m.role = 'Staff')
            )
          );
    END IF;
END
$$;