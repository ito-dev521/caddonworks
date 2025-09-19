-- projectsテーブルのstatus制約にpending_approvalを追加するSQL

-- 1. 現在の制約を削除
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. 新しい制約を追加（既存の値 + pending_approval）
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status IN (
    'bidding',           -- 入札受付中
    'in_progress',       -- 進行中
    'completed',         -- 完了
    'suspended',         -- 中止
    'pending_approval'   -- 承認待ち（新規追加）
));

-- 3. 確認用クエリ
SELECT 
    'projects' as table_name,
    'status_constraint' as column_name,
    'check' as data_type,
    'NO' as is_nullable,
    'updated with pending_approval' as column_default;
