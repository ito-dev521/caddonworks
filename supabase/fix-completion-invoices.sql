-- 既存の業務完了届のシステム手数料を0に修正

-- 1. 現在の業務完了届の状況を確認
SELECT 
    i.id,
    i.contract_id,
    i.base_amount,
    i.system_fee,
    i.total_amount,
    p.title as project_title
FROM invoices i
LEFT JOIN contracts c ON i.contract_id = c.id
LEFT JOIN projects p ON c.project_id = p.id
WHERE i.status = 'issued'
ORDER BY i.id DESC;

-- 2. 業務完了届のシステム手数料を0に更新し、合計金額を基本金額と同じにする
UPDATE invoices 
SET 
    system_fee = 0,
    total_amount = base_amount,
    updated_at = NOW()
WHERE status = 'issued';

-- 3. 更新後の確認
SELECT 
    i.id,
    i.contract_id,
    i.base_amount,
    i.system_fee,
    i.total_amount,
    p.title as project_title
FROM invoices i
LEFT JOIN contracts c ON i.contract_id = c.id
LEFT JOIN projects p ON c.project_id = p.id
WHERE i.status = 'issued'
ORDER BY i.id DESC;
