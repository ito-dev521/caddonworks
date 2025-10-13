-- 契約テーブルに署名済み注文請書のBoxファイルIDカラムを追加

-- 署名済み注文請書のBoxファイルID
ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS order_acceptance_signed_box_id VARCHAR;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_contracts_order_acceptance_signed_box_id
    ON contracts(order_acceptance_signed_box_id);

-- コメントを追加
COMMENT ON COLUMN contracts.order_acceptance_signed_box_id IS '署名済み注文請書のBoxファイルID（プロジェクトフォルダにコピーされたファイル）';

-- 正常に完了したことを確認
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'contracts'
    AND column_name LIKE 'order_acceptance%'
ORDER BY column_name;
