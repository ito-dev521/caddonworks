-- Box ユーザーID連携のためのカラム追加

-- users テーブルにBox関連カラムを追加
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_user_id VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_login VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_sync_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS box_last_synced_at TIMESTAMPTZ;

-- Box ユーザーID にユニーク制約を追加（重複防止）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_box_user_id_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_box_user_id_key UNIQUE (box_user_id);
    END IF;
END $$;

-- Box 同期ログテーブル
CREATE TABLE IF NOT EXISTS box_sync_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    box_user_id VARCHAR(50),
    action VARCHAR(50) NOT NULL, -- 'user_created', 'permission_synced', 'collaboration_added', etc.
    folder_id VARCHAR(100),
    folder_name VARCHAR(100),
    permission_type VARCHAR(50), -- 'previewer', 'viewer', 'uploader', 'editor', etc.
    status VARCHAR(20) NOT NULL, -- 'success', 'failed', 'pending'
    error_message TEXT,
    api_response JSONB,
    synced_by UUID REFERENCES users(id),
    synced_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- Box フォルダ管理テーブル（プロジェクトと Box フォルダの対応）
CREATE TABLE IF NOT EXISTS box_project_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID, -- プロジェクトID（将来拡張用）
    project_name VARCHAR(255),
    box_folder_id VARCHAR(100) NOT NULL,
    folder_type VARCHAR(20) NOT NULL, -- '01_received', '02_work', '03_delivery', '04_contract'
    folder_name VARCHAR(100) NOT NULL,
    box_folder_path VARCHAR(500),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, folder_type)
);

-- Box API 呼び出し履歴テーブル
CREATE TABLE IF NOT EXISTS box_api_calls (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL, -- GET, POST, PUT, DELETE
    request_body JSONB,
    response_status INTEGER,
    response_body JSONB,
    error_message TEXT,
    execution_time_ms INTEGER,
    called_by UUID REFERENCES users(id),
    called_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_box_sync_logs_user_synced ON box_sync_logs(user_id, synced_at);
CREATE INDEX IF NOT EXISTS idx_box_sync_logs_status ON box_sync_logs(status);
CREATE INDEX IF NOT EXISTS idx_box_project_folders_project ON box_project_folders(project_id);
CREATE INDEX IF NOT EXISTS idx_box_project_folders_folder_id ON box_project_folders(box_folder_id);
CREATE INDEX IF NOT EXISTS idx_box_api_calls_endpoint ON box_api_calls(endpoint, called_at);

-- 同期状況のビュー作成
CREATE OR REPLACE VIEW user_box_sync_status AS
SELECT
    u.id,
    u.display_name,
    u.email,
    u.box_user_id,
    u.box_email,
    u.box_sync_status,
    u.box_last_synced_at,
    COUNT(bsl.id) as sync_log_count,
    MAX(bsl.synced_at) as last_sync_attempt,
    COUNT(CASE WHEN bsl.status = 'success' THEN 1 END) as successful_syncs,
    COUNT(CASE WHEN bsl.status = 'failed' THEN 1 END) as failed_syncs
FROM users u
LEFT JOIN box_sync_logs bsl ON u.id = bsl.user_id
GROUP BY u.id, u.display_name, u.email, u.box_user_id, u.box_email, u.box_sync_status, u.box_last_synced_at;

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_box_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_box_project_folders_updated_at
    BEFORE UPDATE ON box_project_folders
    FOR EACH ROW
    EXECUTE FUNCTION update_box_updated_at();

-- 完了ログ
DO $$
BEGIN
    RAISE NOTICE 'Box Drive連携のためのデータベース拡張が完了しました';
    RAISE NOTICE '- users テーブルにBox関連カラム追加';
    RAISE NOTICE '- box_sync_logs: Box同期ログテーブル作成';
    RAISE NOTICE '- box_project_folders: プロジェクト-フォルダ対応テーブル作成';
    RAISE NOTICE '- box_api_calls: API呼び出し履歴テーブル作成';
    RAISE NOTICE '- user_box_sync_status: 同期状況ビュー作成';
END $$;