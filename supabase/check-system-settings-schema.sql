-- system_settingsテーブルのスキーマを確認

-- テーブル構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'system_settings'
ORDER BY ordinal_position;

-- データを確認
SELECT *
FROM public.system_settings
WHERE id = 'global';
