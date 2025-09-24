-- Box権限設定テーブル
CREATE TABLE IF NOT EXISTS box_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    folder_type VARCHAR(20) NOT NULL, -- '01_received', '02_work', '03_delivery', '04_contract'
    folder_name VARCHAR(100) NOT NULL, -- '01_受取データ', '02_作業データ', etc.
    can_preview BOOLEAN DEFAULT true,
    can_download BOOLEAN DEFAULT false,
    can_upload BOOLEAN DEFAULT false,
    can_edit BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, folder_type)
);

-- Box時間制限設定テーブル
CREATE TABLE IF NOT EXISTS box_time_restrictions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    start_time TIME DEFAULT '09:00:00',
    end_time TIME DEFAULT '18:00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Tokyo',
    days_of_week INTEGER[] DEFAULT '{1,2,3,4,5}', -- 月-金 (1=月曜)
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Box日次制限設定テーブル
CREATE TABLE IF NOT EXISTS box_daily_limits (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    enabled BOOLEAN DEFAULT false,
    max_downloads_per_day INTEGER DEFAULT 10,
    max_size_per_day_mb INTEGER DEFAULT 100,
    reset_time TIME DEFAULT '00:00:00',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Box緊急停止状態テーブル
CREATE TABLE IF NOT EXISTS box_emergency_stops (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    is_stopped BOOLEAN DEFAULT false,
    stopped_by UUID REFERENCES users(id),
    stopped_at TIMESTAMPTZ,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Boxダウンロードログテーブル
CREATE TABLE IF NOT EXISTS box_download_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(100),
    file_id VARCHAR(100),
    file_name VARCHAR(255),
    file_size BIGINT,
    folder_id VARCHAR(100),
    folder_name VARCHAR(100),
    result VARCHAR(20) NOT NULL, -- 'success', 'blocked', 'error'
    reason TEXT,
    ip_address INET,
    user_agent TEXT,
    attempted_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Box権限変更ログテーブル
CREATE TABLE IF NOT EXISTS box_permission_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES users(id),
    target_user_id UUID NOT NULL REFERENCES users(id),
    folder_id VARCHAR(100),
    permission_type VARCHAR(50), -- 'download', 'upload', 'edit', etc.
    old_value BOOLEAN,
    new_value BOOLEAN,
    changed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- 緊急操作ログテーブル
CREATE TABLE IF NOT EXISTS emergency_actions_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL REFERENCES users(id),
    admin_email VARCHAR(255),
    action VARCHAR(50) NOT NULL, -- 'stop_all', 'stop_user', 'resume_all', etc.
    affected_user_ids UUID[],
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

-- デフォルト権限設定を挿入する関数
CREATE OR REPLACE FUNCTION create_default_box_permissions(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- デフォルトのフォルダ別権限を設定
    INSERT INTO box_permissions (user_id, folder_type, folder_name, can_preview, can_download, can_upload, can_edit, can_delete)
    VALUES
        (target_user_id, '01_received', '01_受取データ', true, false, false, false, false),
        (target_user_id, '02_work', '02_作業データ', true, false, true, true, false),
        (target_user_id, '03_delivery', '03_納品データ', true, false, true, false, false),
        (target_user_id, '04_contract', '04_契約データ', true, true, false, false, false)
    ON CONFLICT (user_id, folder_type) DO NOTHING;

    -- デフォルトの時間制限設定
    INSERT INTO box_time_restrictions (user_id, enabled, start_time, end_time)
    VALUES (target_user_id, false, '09:00:00', '18:00:00')
    ON CONFLICT (user_id) DO NOTHING;

    -- デフォルトの日次制限設定
    INSERT INTO box_daily_limits (user_id, enabled, max_downloads_per_day, max_size_per_day_mb)
    VALUES (target_user_id, false, 10, 100)
    ON CONFLICT (user_id) DO NOTHING;

    -- 緊急停止状態（デフォルトは停止なし）
    INSERT INTO box_emergency_stops (user_id, is_stopped)
    VALUES (target_user_id, false)
    ON CONFLICT (user_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- 既存の全ユーザーにデフォルト権限を設定
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN SELECT id FROM users LOOP
        PERFORM create_default_box_permissions(user_record.id);
    END LOOP;
END $$;

-- 新規ユーザー作成時に自動でデフォルト権限を設定するトリガー
CREATE OR REPLACE FUNCTION trigger_create_default_box_permissions()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM create_default_box_permissions(NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_new_user_box_permissions
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_create_default_box_permissions();

-- 更新時刻を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_box_permissions_updated_at
    BEFORE UPDATE ON box_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_time_restrictions_updated_at
    BEFORE UPDATE ON box_time_restrictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_daily_limits_updated_at
    BEFORE UPDATE ON box_daily_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_box_emergency_stops_updated_at
    BEFORE UPDATE ON box_emergency_stops
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- インデックスの作成（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_box_permissions_user_id ON box_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_box_permissions_folder_type ON box_permissions(folder_type);
CREATE INDEX IF NOT EXISTS idx_box_download_logs_user_attempted ON box_download_logs(user_id, attempted_at);
CREATE INDEX IF NOT EXISTS idx_box_download_logs_result ON box_download_logs(result);

-- テーブル作成完了のログ
DO $$
BEGIN
    RAISE NOTICE 'Box権限管理テーブルが正常に作成されました';
    RAISE NOTICE '- box_permissions: フォルダ別権限設定';
    RAISE NOTICE '- box_time_restrictions: 時間制限設定';
    RAISE NOTICE '- box_daily_limits: 日次制限設定';
    RAISE NOTICE '- box_emergency_stops: 緊急停止状態';
    RAISE NOTICE '- box_download_logs: ダウンロードログ';
    RAISE NOTICE '- box_permission_logs: 権限変更ログ';
    RAISE NOTICE '- emergency_actions_log: 緊急操作ログ';
END $$;