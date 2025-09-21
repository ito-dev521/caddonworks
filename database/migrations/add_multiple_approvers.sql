-- 複数承認者対応のためのスキーマ変更

-- 1. 既存のapprover_idをapprover_idsに変更し、配列型にする
ALTER TABLE projects ADD COLUMN approver_ids UUID[] DEFAULT '{}';

-- 2. 既存のapprover_idデータをapprover_idsに移行
UPDATE projects
SET approver_ids = ARRAY[approver_id]
WHERE approver_id IS NOT NULL;

-- 3. 古いapprover_idカラムを削除
ALTER TABLE projects DROP COLUMN approver_id;

-- 4. 新しいインデックスを追加（配列型用）
CREATE INDEX idx_projects_approver_ids ON projects USING GIN (approver_ids);

-- 5. 承認待ちの案件の表示権限を管理するためのRLSポリシーを更新
-- （この部分は後でSupabaseダッシュボードで手動設定が必要）