-- 契約テーブルに注文請書署名関連のカラムを追加

-- 注文請書署名リクエストID
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_sign_request_id VARCHAR;

-- 注文請書署名開始日時
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_sign_started_at TIMESTAMP WITH TIME ZONE;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_sign_request_id
    ON contracts(order_acceptance_sign_request_id);

CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_sign_started_at
    ON contracts(order_acceptance_sign_started_at);

-- コメントを追加
COMMENT ON COLUMN contracts.order_acceptance_sign_request_id IS '注文請書のBox Sign署名リクエストID';
COMMENT ON COLUMN contracts.order_acceptance_sign_started_at IS '注文請書署名開始日時';

-- 正常に完了したことを確認
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
    AND column_name LIKE 'order_acceptance%'
ORDER BY column_name;