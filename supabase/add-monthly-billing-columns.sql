-- invoicesテーブルに月次請求用の列を追加

-- 請求年月
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_year INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_month INTEGER;

-- 請求期間ラベル
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_period TEXT;

-- プロジェクトリスト（JSON形式）
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_list JSONB;

-- 方向（from_operator: 運営者から発注者へ、to_operator: 受注者から運営者へ）
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS direction VARCHAR(20) DEFAULT 'to_operator';

-- 基本金額（手数料を除く）
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS base_amount DECIMAL(12,2);

-- システム手数料
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS system_fee DECIMAL(12,2) DEFAULT 0;

-- メモ
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT;

-- project_idをNULL許可に変更（月次請求では複数プロジェクトをまとめるため）
ALTER TABLE invoices ALTER COLUMN project_id DROP NOT NULL;

-- contractor_idをNULL許可に変更（運営者から発注者への請求では不要）
ALTER TABLE invoices ALTER COLUMN contractor_id DROP NOT NULL;

-- amountをNULL許可に変更（base_amountを使用）
ALTER TABLE invoices ALTER COLUMN amount DROP NOT NULL;

-- tax_amountをNULL許可に変更
ALTER TABLE invoices ALTER COLUMN tax_amount DROP NOT NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_invoices_billing_year_month ON invoices(billing_year, billing_month);
CREATE INDEX IF NOT EXISTS idx_invoices_direction ON invoices(direction);

-- コメント
COMMENT ON COLUMN invoices.billing_year IS '請求年（月次請求用）';
COMMENT ON COLUMN invoices.billing_month IS '請求月（月次請求用）';
COMMENT ON COLUMN invoices.billing_period IS '請求期間ラベル（例: 2025年10月分）';
COMMENT ON COLUMN invoices.project_list IS '月次請求の場合の複数プロジェクト情報';
COMMENT ON COLUMN invoices.direction IS '請求方向（from_operator: 運営→発注者、to_operator: 受注者→運営）';
COMMENT ON COLUMN invoices.base_amount IS '基本金額（手数料を除く契約金額の合計）';
COMMENT ON COLUMN invoices.system_fee IS 'システム手数料';
