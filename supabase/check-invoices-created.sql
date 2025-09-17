-- 請求書が作成されているかを確認
SELECT 
    i.id,
    i.contract_id,
    i.status,
    i.total_amount,
    c.project_id,
    p.title as project_title
FROM invoices i
LEFT JOIN contracts c ON i.contract_id = c.id
LEFT JOIN projects p ON c.project_id = p.id
ORDER BY i.id DESC;
