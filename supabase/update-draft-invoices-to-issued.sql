-- 下書き状態の請求書を発行済みに更新するSQL

-- 1. 現在の下書き請求書の確認
SELECT 
    id,
    contract_id,
    status,
    issue_date,
    total_amount,
    base_amount,
    system_fee
FROM invoices 
WHERE status = 'draft';

-- 2. 下書き請求書を発行済みに更新
UPDATE invoices 
SET 
    status = 'issued',
    issue_date = CURRENT_DATE
WHERE status = 'draft';

-- 3. 更新後の確認
SELECT 
    id,
    contract_id,
    status,
    issue_date,
    total_amount,
    base_amount,
    system_fee
FROM invoices 
WHERE status = 'issued';
