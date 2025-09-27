-- 業務完了届管理システム用テーブル作成（簡潔版）
-- 土木設計業務の完了時に提出される完了届を管理

-- 1. 業務完了届テーブル（簡潔版）
CREATE TABLE IF NOT EXISTS completion_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- 基本情報
  report_number VARCHAR(50) UNIQUE NOT NULL, -- 完了届番号（自動生成）
  submission_date DATE NOT NULL DEFAULT CURRENT_DATE,
  actual_completion_date DATE NOT NULL,

  -- ステータス管理
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

  -- デジタル署名情報
  box_sign_request_id VARCHAR, -- Box Sign署名リクエストID
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

-- 2. 完了届テンプレート管理テーブル（簡潔版）
CREATE TABLE IF NOT EXISTS completion_report_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,

  -- テンプレート情報
  template_name VARCHAR(255) NOT NULL,
  template_description TEXT,

  -- テンプレートファイル（Box内のWordやPDFテンプレート）
  box_file_id VARCHAR NOT NULL, -- Box内のテンプレートファイルID

  -- 設定
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,

  -- メタデータ
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_completion_reports_project_id ON completion_reports(project_id);
CREATE INDEX IF NOT EXISTS idx_completion_reports_contract_id ON completion_reports(contract_id);
CREATE INDEX IF NOT EXISTS idx_completion_reports_contractor_id ON completion_reports(contractor_id);
CREATE INDEX IF NOT EXISTS idx_completion_reports_org_id ON completion_reports(org_id);
CREATE INDEX IF NOT EXISTS idx_completion_reports_status ON completion_reports(status);
CREATE INDEX IF NOT EXISTS idx_completion_reports_report_number ON completion_reports(report_number);

CREATE INDEX IF NOT EXISTS idx_completion_report_templates_org_id ON completion_report_templates(org_id);
CREATE INDEX IF NOT EXISTS idx_completion_report_templates_is_active ON completion_report_templates(is_active);

-- 4. 自動更新トリガー
CREATE OR REPLACE FUNCTION update_completion_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE FUNCTION update_completion_report_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガー作成
CREATE TRIGGER update_completion_reports_updated_at
    BEFORE UPDATE ON completion_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_completion_reports_updated_at();

CREATE TRIGGER update_completion_report_templates_updated_at
    BEFORE UPDATE ON completion_report_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_completion_report_templates_updated_at();

-- 5. 完了届番号自動生成関数
CREATE OR REPLACE FUNCTION generate_report_number()
RETURNS TEXT AS $$
DECLARE
    current_year TEXT;
    sequence_num TEXT;
BEGIN
    current_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- その年の完了届数を取得して+1
    SELECT LPAD((COUNT(*) + 1)::TEXT, 4, '0') INTO sequence_num
    FROM completion_reports
    WHERE DATE_PART('year', created_at) = DATE_PART('year', CURRENT_DATE);

    RETURN 'CR-' || current_year || '-' || sequence_num;
END;
$$ LANGUAGE plpgsql;

-- 7. 完了届番号自動設定トリガー
CREATE OR REPLACE FUNCTION set_report_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.report_number IS NULL OR NEW.report_number = '' THEN
        NEW.report_number := generate_report_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_completion_report_number
    BEFORE INSERT ON completion_reports
    FOR EACH ROW
    EXECUTE FUNCTION set_report_number();

-- 8. RLS（Row Level Security）の設定
ALTER TABLE completion_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE completion_report_templates ENABLE ROW LEVEL SECURITY;

-- 受注者は自分の完了届を管理可能
CREATE POLICY "Contractors can manage their completion reports" ON completion_reports
    FOR ALL USING (
        contractor_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- 発注者は自分の組織の完了届を閲覧・承認可能
CREATE POLICY "Org admins can view and approve completion reports" ON completion_reports
    FOR ALL USING (
        org_id IN (
            SELECT m.org_id FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
        )
    );


-- テンプレートは組織管理者が管理
CREATE POLICY "Org admins can manage completion report templates" ON completion_report_templates
    FOR ALL USING (
        org_id IN (
            SELECT m.org_id FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid() AND m.role = 'OrgAdmin'
        )
    );

-- 9. 完了届ステータス更新時の自動処理
CREATE OR REPLACE FUNCTION handle_completion_report_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 承認時にプロジェクトステータスを完了に更新
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        UPDATE projects
        SET status = 'completed'
        WHERE id = NEW.project_id;

        -- 契約ステータスも完了に更新
        UPDATE contracts
        SET status = 'completed'
        WHERE id = NEW.contract_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER completion_report_status_change
    AFTER UPDATE ON completion_reports
    FOR EACH ROW
    EXECUTE FUNCTION handle_completion_report_status_change();

-- 10. 完了届統計ビュー
CREATE OR REPLACE VIEW completion_report_statistics AS
SELECT
    org_id,
    COUNT(*) as total_reports,
    COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_reports,
    COUNT(CASE WHEN status = 'submitted' THEN 1 END) as pending_reports,
    AVG(EXTRACT(days FROM (approved_at - submission_date))) as avg_review_days,
    DATE_TRUNC('month', submission_date) as submission_month
FROM completion_reports
WHERE submission_date >= CURRENT_DATE - INTERVAL '1 year'
GROUP BY org_id, DATE_TRUNC('month', submission_date);