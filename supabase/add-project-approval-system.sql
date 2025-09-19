-- 新規案件登録時の承認機能を追加するSQL

-- 1. 組織テーブルに承認設定を追加
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT FALSE;

-- 2. プロジェクトテーブルに承認者IDを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES users(id);

-- 3. プロジェクトステータスに承認待ちを追加
-- まず、projectsテーブルのstatusカラムの型を確認して適切に処理
DO $$ 
DECLARE
    status_type_name TEXT;
BEGIN
    -- projectsテーブルのstatusカラムの型を取得
    SELECT udt_name INTO status_type_name
    FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status';
    
    -- 型が存在する場合のみ処理
    IF status_type_name IS NOT NULL THEN
        -- enum型の場合
        IF status_type_name LIKE '%enum%' OR status_type_name LIKE '%status%' THEN
            -- 'pending_approval' が存在しない場合のみ追加
            IF NOT EXISTS (
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = 'pending_approval' 
                AND enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = status_type_name
                )
            ) THEN
                EXECUTE format('ALTER TYPE %I ADD VALUE %L', status_type_name, 'pending_approval');
            END IF;
        END IF;
    END IF;
END $$;

-- 4. 通知タイプに承認関連を追加
DO $$ 
BEGIN
    -- 通知タイプの制約を一時的に削除
    ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
    
    -- 新しい制約を追加（既存の値 + 新しい値）
    ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'bid_submitted',
        'bid_accepted', 
        'bid_rejected',
        'contract_created',
        'contract_signed_by_contractor',
        'contract_signed_by_org',
        'contract_declined',
        'invoice_created',
        'invoice_issued',
        'payment_received',
        'project_suspended',
        'project_approval_requested',
        'project_approved',
        'project_rejected'
    ));
END $$;

-- 5. 既存の組織にデフォルト値を設定
UPDATE organizations 
SET approval_required = FALSE 
WHERE approval_required IS NULL;

-- 6. インデックスを追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_projects_approver_id ON projects(approver_id);
CREATE INDEX IF NOT EXISTS idx_projects_status_approval ON projects(status) WHERE status = 'pending_approval';

-- 7. 確認用クエリ
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
    'project_approval_requested, project_approved, project_rejected' as column_default;
