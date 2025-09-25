-- 月次請求書システム安全マイグレーション
-- 既存テーブルがある場合でも実行可能

-- 1. monthly_invoicesテーブル（存在しない場合のみ作成）
CREATE TABLE IF NOT EXISTS monthly_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id UUID NOT NULL REFERENCES users(id),
  billing_year INTEGER NOT NULL,
  billing_month INTEGER NOT NULL,
  cutoff_date DATE NOT NULL, -- 20日締めの日付

  -- プロジェクト集計（後で追加されたカラムの可能性があるため、既存スキーマを確認）
  project_count INTEGER DEFAULT 0,
  system_fee_total DECIMAL(12,2) DEFAULT 0, -- 既存の実装と合わせる

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

-- 2. monthly_invoice_projectsテーブル
CREATE TABLE IF NOT EXISTS monthly_invoice_projects (
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

-- 3. Box Sign署名テーブル拡張（カラムが存在しない場合のみ追加）
DO $$
BEGIN
  -- monthly_invoice_idカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'box_sign_requests'
    AND column_name = 'monthly_invoice_id'
  ) THEN
    ALTER TABLE box_sign_requests
    ADD COLUMN monthly_invoice_id UUID REFERENCES monthly_invoices(id);
  END IF;

  -- document_type_categoryカラムを追加（存在しない場合のみ）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'box_sign_requests'
    AND column_name = 'document_type_category'
  ) THEN
    ALTER TABLE box_sign_requests
    ADD COLUMN document_type_category VARCHAR DEFAULT 'project';
  END IF;
END $$;

-- 4. 月次請求書自動生成ジョブ管理
CREATE TABLE IF NOT EXISTS monthly_billing_jobs (
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

-- 5. インデックス作成（存在しない場合のみ）
DO $$
BEGIN
  -- monthly_invoices用インデックス
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_monthly_invoices_contractor_period'
  ) THEN
    CREATE INDEX idx_monthly_invoices_contractor_period
    ON monthly_invoices(contractor_id, billing_year, billing_month);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_monthly_invoices_status'
  ) THEN
    CREATE INDEX idx_monthly_invoices_status
    ON monthly_invoices(status);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_monthly_invoices_cutoff_date'
  ) THEN
    CREATE INDEX idx_monthly_invoices_cutoff_date
    ON monthly_invoices(cutoff_date);
  END IF;
END $$;

-- 6. トリガー関数（既存の場合は置き換え）
CREATE OR REPLACE FUNCTION update_monthly_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. トリガー作成（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_monthly_invoice_updated_at'
  ) THEN
    CREATE TRIGGER trigger_update_monthly_invoice_updated_at
      BEFORE UPDATE ON monthly_invoices
      FOR EACH ROW EXECUTE FUNCTION update_monthly_invoice_updated_at();
  END IF;
END $$;

-- 8. 月次請求書ステータス更新関数
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

-- 9. 署名ステータストリガー（存在しない場合のみ）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_update_monthly_invoice_signature'
  ) THEN
    CREATE TRIGGER trigger_update_monthly_invoice_signature
      AFTER UPDATE ON box_sign_requests
      FOR EACH ROW EXECUTE FUNCTION update_monthly_invoice_signature_status();
  END IF;
END $$;

-- 10. 既存データの整合性確認とデータ修正
-- 既存のmonthly_invoicesテーブルに必要なカラムが不足している場合の対応
DO $$
BEGIN
  -- system_fee_totalカラムが存在するかチェック
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_invoices'
    AND column_name = 'system_fee_total'
  ) THEN
    -- 既存実装との互換性のためsystem_fee_totalカラムを追加
    ALTER TABLE monthly_invoices
    ADD COLUMN system_fee_total DECIMAL(12,2) DEFAULT 0;
  END IF;

  -- project_countカラムのデフォルト値設定
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'monthly_invoices'
    AND column_name = 'project_count'
    AND column_default IS NULL
  ) THEN
    ALTER TABLE monthly_invoices
    ALTER COLUMN project_count SET DEFAULT 0;
  END IF;
END $$;

-- コメント追加
COMMENT ON TABLE monthly_invoices IS '月次請求書管理（20日締め、21日生成）';
COMMENT ON TABLE monthly_invoice_projects IS '月次請求書に含まれるプロジェクト詳細';
COMMENT ON TABLE monthly_billing_jobs IS '月次請求書自動生成ジョブ管理';

COMMENT ON COLUMN monthly_invoices.cutoff_date IS '20日締めの基準日';
COMMENT ON COLUMN monthly_invoices.system_fee_total IS 'システム利用料合計（プロジェクト金額の10%）';
COMMENT ON COLUMN monthly_invoices.status IS 'draft: 下書き, pending_signature: 署名待ち, signed: 署名完了, paid: 支払済み';

-- 実行完了メッセージ
SELECT 'Monthly invoice migration completed successfully!' as result;