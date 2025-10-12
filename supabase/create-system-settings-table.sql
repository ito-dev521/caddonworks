-- システム設定テーブルの作成

CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(50) PRIMARY KEY,
    support_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
    default_system_fee DECIMAL(10,2) DEFAULT 50000,
    platform_name VARCHAR(100) DEFAULT 'CADDON',
    support_email VARCHAR(255) DEFAULT 'support@caddon.jp',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- グローバル設定レコードを挿入（既に存在する場合はスキップ）
INSERT INTO system_settings (id, support_fee_percent, default_system_fee, platform_name, support_email)
VALUES ('global', 8.00, 50000, 'CADDON', 'support@caddon.jp')
ON CONFLICT (id) DO NOTHING;

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at_trigger
    BEFORE UPDATE ON system_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_system_settings_updated_at();

-- 確認
SELECT * FROM system_settings WHERE id = 'global';
