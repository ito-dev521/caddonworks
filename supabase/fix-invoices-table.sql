-- invoicesテーブルにupdated_atカラムを追加し、既存の下書き請求書を発行済みに更新

-- 1. invoicesテーブルにupdated_atカラムを追加
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. 既存のレコードのupdated_atを現在時刻に設定
UPDATE invoices 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- 3. updated_atカラムにNOT NULL制約を追加
ALTER TABLE invoices 
ALTER COLUMN updated_at SET NOT NULL;

-- 4. 現在の下書き請求書の確認
SELECT 
    id,
    contract_id,
    status,
    issue_date,
    total_amount,
    base_amount,
    system_fee,
    updated_at
FROM invoices 
WHERE status = 'draft';

-- 5. 下書き請求書を発行済みに更新
UPDATE invoices 
SET 
    status = 'issued',
    issue_date = CURRENT_DATE,
    updated_at = NOW()
WHERE status = 'draft';

-- 6. 更新後の確認
SELECT 
    id,
    contract_id,
    status,
    issue_date,
    total_amount,
    base_amount,
    system_fee,
    updated_at
FROM invoices 
WHERE status = 'issued';
