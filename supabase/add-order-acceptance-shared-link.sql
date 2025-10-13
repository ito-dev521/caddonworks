-- 契約テーブルに注文請書共有リンクのカラムを追加

-- 注文請書のBox共有リンクURL
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_shared_link VARCHAR;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_shared_link
    ON contracts(order_acceptance_shared_link);

-- コメントを追加
COMMENT ON COLUMN contracts.order_acceptance_shared_link IS '注文請書のBox共有リンクURL';

-- 正常に完了したことを確認
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
    AND column_name = 'order_acceptance_shared_link'
ORDER BY column_name;
