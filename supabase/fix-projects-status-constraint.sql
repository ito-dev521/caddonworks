-- projectsテーブルのstatus制約にpending_approvalとrejectedを追加するSQL

-- 1. 現在の制約を削除
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check;

-- 2. 新しい制約を追加（すべてのステータス値を含む）
ALTER TABLE projects ADD CONSTRAINT projects_status_check 
CHECK (status IN (
    'bidding',           -- 入札受付中
    'in_progress',       -- 進行中
    'completed',         -- 完了
    'suspended',         -- 中止
    'pending_approval',  -- 承認待ち
    'rejected'           -- 却下
));

-- 3. 確認用クエリ
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conname = 'projects_status_check';
