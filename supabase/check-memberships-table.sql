-- membershipsテーブルの構造確認
-- テーブルの存在確認とカラム構造を調べる

-- 1. membershipsテーブルが存在するか確認
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'memberships'
) as table_exists;

-- 2. membershipsテーブルのカラム構造を確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'memberships'
ORDER BY ordinal_position;

-- 3. membershipsテーブルのサンプルデータを確認（存在する場合）
SELECT * FROM memberships LIMIT 5;
