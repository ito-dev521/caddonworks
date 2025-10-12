-- サポート手数料率の設定を追加

INSERT INTO public.system_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES ('support_fee_percent', '8', 'number', 'サポート手数料（%）', true)
ON CONFLICT (setting_key) DO UPDATE
SET setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- 確認
SELECT * FROM public.system_settings WHERE setting_key = 'support_fee_percent';
