-- テスト作業の契約金額と業務完了届の金額の不一致を確認

-- 1. テスト作業のプロジェクト情報
SELECT 
    p.id as project_id,
    p.title,
    p.budget as project_budget,
    p.status as project_status
FROM projects p
WHERE p.title = 'テスト作業';

-- 2. テスト作業の契約情報
SELECT 
    c.id as contract_id,
    c.project_id,
    c.bid_amount as contract_amount,
    c.status as contract_status,
    p.title as project_title
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
WHERE p.title = 'テスト作業';

-- 3. テスト作業の業務完了届（請求書）情報
SELECT 
    i.id as invoice_id,
    i.contract_id,
    i.base_amount,
    i.system_fee,
    i.total_amount,
    i.status as invoice_status,
    p.title as project_title
FROM invoices i
LEFT JOIN contracts c ON i.contract_id = c.id
LEFT JOIN projects p ON c.project_id = p.id
WHERE p.title = 'テスト作業';

-- 4. 全体的な金額の流れを確認
SELECT 
    p.title as project_title,
    p.budget as project_budget,
    c.bid_amount as contract_amount,
    i.base_amount as invoice_base_amount,
    i.system_fee as invoice_system_fee,
    i.total_amount as invoice_total_amount,
    (i.base_amount + i.system_fee) as calculated_total
FROM projects p
LEFT JOIN contracts c ON p.id = c.project_id
LEFT JOIN invoices i ON c.id = i.contract_id
WHERE p.title = 'テスト作業';
