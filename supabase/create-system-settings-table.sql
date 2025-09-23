-- システム設定テーブルの作成
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  setting_type VARCHAR(50) NOT NULL DEFAULT 'string', -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  is_public BOOLEAN DEFAULT false, -- 公開設定（クライアント側で取得可能かどうか）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 初期データの挿入
INSERT INTO system_settings (setting_key, setting_value, setting_type, description, is_public) VALUES
('default_system_fee', '50000', 'number', 'デフォルトシステム利用料（円）', true),
('platform_name', 'CADDON', 'string', 'プラットフォーム名', true),
('support_email', 'support@caddon.jp', 'string', 'サポートメールアドレス', true),
('maintenance_mode', 'false', 'boolean', 'メンテナンスモード', false);

-- RLS (Row Level Security) を有効化
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 管理者のみ編集可能、認証済みユーザーは読み取り可能
CREATE POLICY "Allow admin full access to system_settings" ON system_settings
  FOR ALL USING (
    auth.jwt() ->> 'user_metadata' ->> 'role' = 'SuperAdmin'
  );

CREATE POLICY "Allow authenticated users to read public settings" ON system_settings
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_public = true
  );

-- 更新時刻の自動更新トリガー
CREATE OR REPLACE FUNCTION update_system_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_system_settings_updated_at();