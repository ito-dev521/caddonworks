-- 請求書データを削除
DELETE FROM invoices;

-- 削除結果を確認
SELECT COUNT(*) as remaining_invoices FROM invoices;
