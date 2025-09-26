-- ============================================================================
-- 完全なデータベース修正スクリプト
-- Supabase Dashboard の SQL Editor で実行してください
-- ============================================================================

-- 1. organizations テーブルに status カラムを追加
ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';

-- 2. emergency_actions_log テーブルの完全修正

-- 問題のあるレコード（存在しないユーザーを参照）を削除
DELETE FROM emergency_actions_log
WHERE admin_user_id IS NOT NULL
  AND admin_user_id NOT IN (SELECT id FROM users);

-- 既存の外部キー制約を削除
ALTER TABLE emergency_actions_log
DROP CONSTRAINT IF EXISTS emergency_actions_log_admin_user_id_fkey;

-- admin_user_id を NULLABLE に変更
ALTER TABLE emergency_actions_log
ALTER COLUMN admin_user_id DROP NOT NULL;

-- created_at カラムを追加（存在しない場合）
ALTER TABLE emergency_actions_log
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();

-- updated_at カラムを追加（存在しない場合）
ALTER TABLE emergency_actions_log
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- 新しい外部キー制約を追加（ON DELETE SET NULL）
ALTER TABLE emergency_actions_log
ADD CONSTRAINT emergency_actions_log_admin_user_id_fkey
FOREIGN KEY (admin_user_id) REFERENCES users(id)
ON DELETE SET NULL ON UPDATE CASCADE;

-- 2.5. box_permission_logs テーブルの修正（存在する場合）

-- 問題のあるレコード（存在しないユーザーを参照）を削除
DELETE FROM box_permission_logs
WHERE admin_user_id IS NOT NULL
  AND admin_user_id NOT IN (SELECT id FROM users);

-- 既存の外部キー制約を削除
ALTER TABLE box_permission_logs
DROP CONSTRAINT IF EXISTS box_permission_logs_admin_user_id_fkey;

-- admin_user_id を NULLABLE に変更（存在する場合）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'box_permission_logs' AND column_name = 'admin_user_id') THEN
    ALTER TABLE box_permission_logs ALTER COLUMN admin_user_id DROP NOT NULL;
  END IF;
END $$;

-- 新しい外部キー制約を追加（ON DELETE SET NULL）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'box_permission_logs') THEN
    ALTER TABLE box_permission_logs
    ADD CONSTRAINT box_permission_logs_admin_user_id_fkey
    FOREIGN KEY (admin_user_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 3. Box Sign関連テーブルの確認・作成

-- signature_requests テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS signature_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    box_sign_request_id VARCHAR(255) UNIQUE,
    document_name VARCHAR(255) NOT NULL,
    document_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'created',
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    contract_id UUID REFERENCES contracts(id) ON DELETE CASCADE,
    box_file_id VARCHAR(255),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- signature_signers テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS signature_signers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_request_id UUID REFERENCES signature_requests(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'awaiting_signature',
    signed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- monthly_invoices テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS monthly_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID REFERENCES users(id) ON DELETE CASCADE,
    billing_year INTEGER NOT NULL,
    billing_month INTEGER NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    system_fee_total DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    signature_request_id UUID REFERENCES signature_requests(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(contractor_id, billing_year, billing_month)
);

-- monthly_invoice_projects テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS monthly_invoice_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_invoice_id UUID REFERENCES monthly_invoices(id) ON DELETE CASCADE,
    project_id UUID NOT NULL,
    project_title VARCHAR(255) NOT NULL,
    project_amount DECIMAL(10,2) NOT NULL,
    completion_date TIMESTAMP,
    system_fee DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- box_emergency_stops テーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS box_emergency_stops (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    is_stopped BOOLEAN DEFAULT FALSE,
    stopped_by UUID REFERENCES users(id) ON DELETE SET NULL,
    stopped_at TIMESTAMP,
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 4. インデックスの追加（パフォーマンス向上のため）

-- emergency_actions_log のインデックス
CREATE INDEX IF NOT EXISTS idx_emergency_actions_log_admin_user_id
ON emergency_actions_log(admin_user_id);

CREATE INDEX IF NOT EXISTS idx_emergency_actions_log_created_at
ON emergency_actions_log(created_at);

-- signature_requests のインデックス
CREATE INDEX IF NOT EXISTS idx_signature_requests_project_id
ON signature_requests(project_id);

CREATE INDEX IF NOT EXISTS idx_signature_requests_status
ON signature_requests(status);

CREATE INDEX IF NOT EXISTS idx_signature_requests_created_at
ON signature_requests(created_at);

-- monthly_invoices のインデックス
CREATE INDEX IF NOT EXISTS idx_monthly_invoices_contractor_billing
ON monthly_invoices(contractor_id, billing_year, billing_month);

CREATE INDEX IF NOT EXISTS idx_monthly_invoices_status
ON monthly_invoices(status);

-- box_emergency_stops のインデックス
CREATE INDEX IF NOT EXISTS idx_box_emergency_stops_user_id
ON box_emergency_stops(user_id);

CREATE INDEX IF NOT EXISTS idx_box_emergency_stops_is_stopped
ON box_emergency_stops(is_stopped);

-- 5. 結果確認クエリ

-- 修正されたテーブル構造を確認
SELECT
    'organizations status column' as check_item,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'organizations' AND column_name = 'status'
        ) THEN '✅ 存在します'
        ELSE '❌ 存在しません'
    END as result

UNION ALL

SELECT
    'emergency_actions_log created_at column' as check_item,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'emergency_actions_log' AND column_name = 'created_at'
        ) THEN '✅ 存在します'
        ELSE '❌ 存在しません'
    END as result

UNION ALL

SELECT
    'emergency_actions_log foreign key' as check_item,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint
            WHERE conname = 'emergency_actions_log_admin_user_id_fkey'
        ) THEN '✅ 修正済み'
        ELSE '❌ 未修正'
    END as result

UNION ALL

SELECT
    'signature_requests table' as check_item,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'signature_requests'
        ) THEN '✅ 存在します'
        ELSE '❌ 存在しません'
    END as result

UNION ALL

SELECT
    'monthly_invoices table' as check_item,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables
            WHERE table_name = 'monthly_invoices'
        ) THEN '✅ 存在します'
        ELSE '❌ 存在しません'
    END as result;

-- 最終確認メッセージ
SELECT
    'データベース修正完了' as status,
    NOW() as completed_at;