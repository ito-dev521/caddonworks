-- 全てのプロジェクト関連データを削除
-- 本番仕様に合わせるため、全てのデモデータを削除
-- 外部キー制約に従って順序よく削除

-- 1. 請求書を削除（プロジェクトを参照している）
DELETE FROM invoices;

-- 2. チャットメッセージを削除（プロジェクトを参照している可能性）
DELETE FROM chat_messages;

-- 3. 入札情報を削除
DELETE FROM bids;

-- 4. 契約情報を削除
DELETE FROM contracts;

-- 5. プロジェクトを削除
DELETE FROM projects;

-- 削除結果を確認
SELECT 'プロジェクト' as table_name, COUNT(*) as remaining_count FROM projects
UNION ALL
SELECT '契約' as table_name, COUNT(*) as remaining_count FROM contracts
UNION ALL
SELECT '入札' as table_name, COUNT(*) as remaining_count FROM bids
UNION ALL
SELECT '請求書' as table_name, COUNT(*) as remaining_count FROM invoices
UNION ALL
SELECT 'チャット' as table_name, COUNT(*) as remaining_count FROM chat_messages;