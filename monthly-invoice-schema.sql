-- 月次請求書管理テーブル
CREATE TABLE monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id),
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL,
  cutoff_date DATE NOT NULL, -- 20日締めの日付

  -- プロジェクト集計
  project_ids UUID[] NOT NULL, -- 対象プロジェクトID配列
  project_count INTEGER NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,

  -- 請求書ファイル情報
  invoice_template_id UUID REFERENCES document_templates(id),
  generated_invoice_box_id VARCHAR, -- 生成された請求書のBox file ID

  -- 署名関連
  box_sign_request_id VARCHAR, -- Box Sign リクエストID
  contractor_signed_at TIMESTAMP,
  operator_signed_at TIMESTAMP,
  signature_completed_at TIMESTAMP,

  -- ステータス管理
  status VARCHAR NOT NULL DEFAULT 'draft', -- 'draft', 'pending_signature', 'signed', 'paid'

  -- メタデータ
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- 制約
  UNIQUE(contractor_id, billing_year, billing_month)
);

-- 月次請求書に含まれるプロジェクト詳細
CREATE TABLE monthly_invoice_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_invoice_id UUID NOT NULL REFERENCES monthly_invoices(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id),

  -- プロジェクト情報（請求時点でのスナップショット）
  project_title VARCHAR NOT NULL,
  completion_date DATE NOT NULL,
  project_amount DECIMAL(12,2) NOT NULL,
  system_fee DECIMAL(12,2) NOT NULL,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Box Sign署名テーブル拡張（月次請求書対応）
ALTER TABLE box_sign_requests
ADD COLUMN monthly_invoice_id UUID REFERENCES monthly_invoices(id),
ADD COLUMN document_type_category VARCHAR DEFAULT 'project'; -- 'project', 'monthly_invoice'

-- 月次請求書自動生成ジョブ管理
CREATE TABLE monthly_billing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL,
  job_status VARCHAR NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'

  contractors_processed INTEGER DEFAULT 0,
  total_contractors INTEGER DEFAULT 0,

  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,

  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(billing_year, billing_month)
);

-- インデックス作成
CREATE INDEX idx_monthly_invoices_contractor_period
ON monthly_invoices(contractor_id, billing_year, billing_month);

CREATE INDEX idx_monthly_invoices_status
ON monthly_invoices(status);

CREATE INDEX idx_monthly_invoices_cutoff_date
ON monthly_invoices(cutoff_date);

-- 自動更新トリガー
CREATE OR REPLACE FUNCTION update_monthly_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_invoice_updated_at
    BEFORE UPDATE ON monthly_invoices
    FOR EACH ROW EXECUTE FUNCTION update_monthly_invoice_updated_at();

-- 月次請求書ステータス更新関数
CREATE OR REPLACE FUNCTION update_monthly_invoice_signature_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Box Sign署名完了時に月次請求書ステータスを更新
  IF NEW.status = 'signed' AND OLD.status != 'signed' AND NEW.monthly_invoice_id IS NOT NULL THEN
    UPDATE monthly_invoices
    SET
      signature_completed_at = NEW.completed_at,
      status = 'signed'
    WHERE id = NEW.monthly_invoice_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_monthly_invoice_signature
  AFTER UPDATE ON box_sign_requests
  FOR EACH ROW EXECUTE FUNCTION update_monthly_invoice_signature_status();