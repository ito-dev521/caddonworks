-- invoicesテーブルに月次請求用の列を追加（必要な列のみ）

-- 請求年月
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_year INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_month INTEGER;

-- 請求期間ラベル
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_period TEXT;

-- プロジェクトリスト（JSON形式）
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_list JSONB;

-- メモ
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT;

-- 請求書番号
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invoices_billing_year_month ON invoices(billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_direction ON invoices(direction);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- コメント
COMMENT ON COLUMN invoices.billing_year IS '請求年（月次請求用）';
COMMENT ON COLUMN invoices.billing_month IS '請求月（月次請求用）';
COMMENT ON COLUMN invoices.billing_period IS '請求期間ラベル（例: 2025年10月分）';
COMMENT ON COLUMN invoices.project_list IS '月次請求の場合の複数プロジェクト情報';
COMMENT ON COLUMN invoices.memo IS 'メモ・備考';
COMMENT ON COLUMN invoices.invoice_number IS '請求書番号';
