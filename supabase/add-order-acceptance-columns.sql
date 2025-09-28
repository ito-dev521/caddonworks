-- 契約テーブルに注文請書関連のカラムを追加

-- 注文請書生成日時
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_generated_at TIMESTAMP WITH TIME ZONE;

-- 注文請書のBoxファイルID
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_box_id VARCHAR;

-- 注文請書番号
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_number VARCHAR;

-- 注文請書の署名完了日時（将来的な電子署名対応）
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_signed_at TIMESTAMP WITH TIME ZONE;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_generated_at
    ON contracts(order_acceptance_generated_at);

CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_box_id
    ON contracts(order_acceptance_box_id);

-- コメントを追加
COMMENT ON COLUMN contracts.order_acceptance_generated_at IS '注文請書生成日時';
COMMENT ON COLUMN contracts.order_acceptance_box_id IS '注文請書のBoxファイルID';
COMMENT ON COLUMN contracts.order_acceptance_number IS '注文請書番号';
COMMENT ON COLUMN contracts.order_acceptance_signed_at IS '注文請書の署名完了日時';

-- 正常に完了したことを確認
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
    AND column_name LIKE 'order_acceptance%'
ORDER BY column_name;