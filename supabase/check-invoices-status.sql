-- 請求書（業務完了届）の作成状況を確認するSQL

-- 1. 請求書テーブルの構造確認
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'invoices' 
ORDER BY ordinal_position;

-- 2. 請求書データの確認
SELECT 
    i.id,
    i.project_id,
    i.contract_id,
    i.type,
    i.status,
    i.total_amount,
    i.created_at,
    p.title as project_title,
    p.status as project_status,
    c.status as contract_status
FROM invoices i
LEFT JOIN projects p ON i.project_id = p.id
LEFT JOIN contracts c ON i.contract_id = c.id
ORDER BY i.created_at DESC;

-- 3. 完了済みプロジェクトの請求書作成状況
SELECT 
    p.id as project_id,
    p.title,
    p.status as project_status,
    p.contractor_id,
    c.id as contract_id,
    c.status as contract_status,
    i.id as invoice_id,
    i.type as invoice_type,
    i.status as invoice_status,
    i.total_amount,
    i.created_at as invoice_created_at
FROM projects p
LEFT JOIN contracts c ON p.id = c.project_id
LEFT JOIN invoices i ON c.id = i.contract_id
WHERE p.status = 'completed'
ORDER BY p.updated_at DESC;

-- 4. 評価データの確認
SELECT 
    ce.id,
    ce.project_id,
    ce.contract_id,
    ce.contractor_id,
    ce.evaluator_id,
    ce.average_score,
    ce.created_at as evaluation_created_at,
    p.title as project_title,
    p.status as project_status
FROM contractor_evaluations ce
LEFT JOIN projects p ON ce.project_id = p.id
WHERE p.status = 'completed'
ORDER BY ce.created_at DESC;
