-- Box Sign電子署名システムのテーブル作成

-- 書類テンプレート管理
CREATE TABLE document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL, -- 'order', 'completion', 'monthly_invoice'
  description TEXT,
  box_file_id VARCHAR, -- 実際のテンプレートファイル（後で設定）
  mock_template_data JSONB, -- モック用のテンプレートデータ
  template_fields JSONB, -- 自動入力フィールド定義
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Box Sign署名リクエスト管理
CREATE TABLE box_sign_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  contract_id UUID REFERENCES contracts(id),
  monthly_invoice_id UUID, -- 月次請求書ID（後で外部キー追加）
  template_id UUID REFERENCES document_templates(id),

  -- Box Sign関連
  box_sign_request_id VARCHAR, -- Box側のリクエストID
  document_type VARCHAR NOT NULL, -- 'order', 'completion', 'monthly_invoice'
  document_type_category VARCHAR DEFAULT 'project', -- 'project', 'monthly_invoice'

  -- ステータス管理
  status VARCHAR NOT NULL DEFAULT 'draft', -- 'draft', 'pending', 'signed', 'declined', 'expired'

  -- 署名者情報
  signers JSONB NOT NULL, -- 署名者情報の配列

  -- ファイル管理
  source_document_id VARCHAR, -- 生成された書類のBox file ID
  signed_document_id VARCHAR, -- 署名完了後のBox file ID

  -- タイミング
  created_at TIMESTAMP DEFAULT NOW(),
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- 署名履歴管理
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_request_id UUID REFERENCES box_sign_requests(id) ON DELETE CASCADE,
  signer_email VARCHAR NOT NULL,
  signer_role VARCHAR NOT NULL, -- 'client', 'contractor', 'operator'
  signer_name VARCHAR,

  -- 署名情報
  signed_at TIMESTAMP,
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 月次請求書管理
CREATE TABLE monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id),
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL,
  cutoff_date DATE NOT NULL,

  -- プロジェクト集計
  project_ids UUID[] NOT NULL,
  project_count INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  system_fee_total DECIMAL(12,2) NOT NULL,

  -- 請求書ファイル情報
  invoice_template_id UUID REFERENCES document_templates(id),
  generated_invoice_box_id VARCHAR,

  -- 署名関連
  box_sign_request_id VARCHAR,
  contractor_signed_at TIMESTAMP,
  operator_signed_at TIMESTAMP,
  signature_completed_at TIMESTAMP,

  -- ステータス管理
  status VARCHAR NOT NULL DEFAULT 'draft', -- 'draft', 'pending_signature', 'signed', 'paid'

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(contractor_id, billing_year, billing_month)
);

-- 月次請求書プロジェクト詳細
CREATE TABLE monthly_invoice_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_invoice_id UUID NOT NULL REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),

  -- スナップショット情報
  project_title VARCHAR NOT NULL,
  completion_date DATE NOT NULL,
  project_amount DECIMAL(12,2) NOT NULL,
  system_fee DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- 月次請求書生成ジョブ管理
CREATE TABLE monthly_billing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL,
  job_status VARCHAR NOT NULL DEFAULT 'pending',

  contractors_processed INTEGER DEFAULT 0,
  total_contractors INTEGER DEFAULT 0,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(billing_year, billing_month)
);

-- 外部キー制約追加
ALTER TABLE box_sign_requests
ADD CONSTRAINT fk_box_sign_monthly_invoice
FOREIGN KEY (monthly_invoice_id) REFERENCES monthly_invoices(id);

-- インデックス作成
CREATE INDEX idx_box_sign_requests_project ON box_sign_requests(project_id);
CREATE INDEX idx_box_sign_requests_status ON box_sign_requests(status);
CREATE INDEX idx_box_sign_requests_type ON box_sign_requests(document_type);

CREATE INDEX idx_document_signatures_request ON document_signatures(sign_request_id);
CREATE INDEX idx_document_signatures_email ON document_signatures(signer_email);

CREATE INDEX idx_monthly_invoices_contractor_period ON monthly_invoices(contractor_id, billing_year, billing_month);
CREATE INDEX idx_monthly_invoices_status ON monthly_invoices(status);

-- モックテンプレートデータの挿入
INSERT INTO document_templates (name, type, description, mock_template_data, template_fields, is_active) VALUES
(
  '発注書テンプレート',
  'order',
  'プロジェクト発注時の発注書',
  '{"title": "発注書", "content": "下記の通り発注いたします", "fields": ["project_title", "contractor_name", "amount", "deadline"]}',
  '{"project_title": {"type": "text", "label": "プロジェクト名"}, "contractor_name": {"type": "text", "label": "受注者名"}, "amount": {"type": "number", "label": "契約金額"}, "deadline": {"type": "date", "label": "納期"}}',
  true
),
(
  '完了届テンプレート',
  'completion',
  'プロジェクト完了時の完了届',
  '{"title": "完了届", "content": "下記プロジェクトが完了いたしました", "fields": ["project_title", "contractor_name", "completion_date", "deliverables"]}',
  '{"project_title": {"type": "text", "label": "プロジェクト名"}, "contractor_name": {"type": "text", "label": "受注者名"}, "completion_date": {"type": "date", "label": "完了日"}, "deliverables": {"type": "text", "label": "成果物"}}',
  true
),
(
  '月次請求書テンプレート',
  'monthly_invoice',
  '受注者から運営者への月次請求書',
  '{"title": "月次請求書", "content": "下記の通り請求いたします", "fields": ["billing_period", "contractor_name", "project_list", "total_amount", "fee_amount"]}',
  '{"billing_period": {"type": "text", "label": "請求対象期間"}, "contractor_name": {"type": "text", "label": "受注者名"}, "project_list": {"type": "array", "label": "対象プロジェクト"}, "total_amount": {"type": "number", "label": "請求金額"}, "fee_amount": {"type": "number", "label": "システム利用料"}}',
  true
);

-- 更新時刻自動更新のトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_monthly_invoices_updated_at
    BEFORE UPDATE ON monthly_invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 署名完了時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_signature_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- プロジェクト関連の署名完了処理
  IF NEW.status = 'signed' AND OLD.status != 'signed' THEN
    IF NEW.project_id IS NOT NULL THEN
      -- contracts テーブルの署名日時更新
      IF NEW.document_type = 'order' THEN
        UPDATE contracts
        SET contractor_signed_at = NEW.completed_at,
            org_signed_at = NEW.completed_at,
            signed_at = NEW.completed_at
        WHERE project_id = NEW.project_id;
      END IF;

      -- プロジェクトステータス更新
      IF NEW.document_type = 'completion' THEN
        UPDATE projects
        SET status = 'completed',
            completed_at = NEW.completed_at
        WHERE id = NEW.project_id;
      END IF;
    END IF;

    -- 月次請求書の署名完了処理
    IF NEW.monthly_invoice_id IS NOT NULL THEN
      UPDATE monthly_invoices
      SET signature_completed_at = NEW.completed_at,
          status = 'signed'
      WHERE id = NEW.monthly_invoice_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_signature_completion
  AFTER UPDATE ON box_sign_requests
  FOR EACH ROW EXECUTE FUNCTION update_signature_completion();

-- テーブル作成完了ログ
DO $$
BEGIN
    RAISE NOTICE 'Box Sign電子署名テーブルが正常に作成されました';
    RAISE NOTICE '- document_templates: 書類テンプレート管理';
    RAISE NOTICE '- box_sign_requests: 署名リクエスト管理';
    RAISE NOTICE '- document_signatures: 署名履歴管理';
    RAISE NOTICE '- monthly_invoices: 月次請求書管理';
    RAISE NOTICE '- monthly_invoice_projects: 請求書プロジェクト詳細';
    RAISE NOTICE '- monthly_billing_jobs: 請求書生成ジョブ管理';
    RAISE NOTICE 'モックテンプレートデータも挿入されました';
END $$;