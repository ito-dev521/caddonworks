-- 新規案件登録時の承認機能を追加するSQL（修正版）

-- 1. 組織テーブルに承認設定を追加
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;

-- 2. プロジェクトテーブルに承認者IDを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);

-- 3. 通知タイプに承認関連を追加（既存の値を保持）
DO $$ 
DECLARE
    existing_types TEXT[];
    new_types TEXT[] := ARRAY['project_approval_requested', 'project_approved', 'project_rejected'];
    all_types TEXT[];
BEGIN
    -- 既存のtype値を取得
    SELECT ARRAY_AGG(DISTINCT type) INTO existing_types
    FROM notifications;
    
    -- 既存の値と新しい値を結合
    all_types := existing_types || new_types;
    
    -- 通知タイプの制約を削除
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- 新しい制約を追加（既存の値 + 新しい値）
    EXECUTE format('ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY(%L))', all_types);
END $$;

-- 4. 既存の組織にデフォルト値を設定
UPDATE organizations 
SET approval_required = FALSE 
WHERE approval_required IS NULL;

-- 5. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_projects_approver_id ON projects(approver_id);

-- 6. 確認用クエリ
SELECT 
    'organizations' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'organizations' 
AND column_name = 'approval_required'

UNION ALL

SELECT 
    'projects' as table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
AND column_name = 'approver_id'

UNION ALL

SELECT 
    'notifications' as table_name,
    'type_constraint' as column_name,
    'check' as data_type,
    'NO' as is_nullable,
    'updated with existing + new types' as column_default;
