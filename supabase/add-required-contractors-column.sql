-- projectsテーブルにrequired_contractorsカラムを追加
-- 新規案件登録でエラーが発生している問題を解決

-- 1. required_contractorsカラムを追加（デフォルト値1）
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS required_contractors INTEGER DEFAULT 1;

-- 2. 既存のレコードでrequired_contractorsがNULLの場合は1に設定
UPDATE projects 
SET required_contractors = 1 
WHERE required_contractors IS NULL;

-- 3. required_contractorsカラムをNOT NULLに設定
ALTER TABLE projects 
ALTER COLUMN required_contractors SET NOT NULL;

-- 4. インデックスを作成（パフォーマンス向上のため）
CREATE INDEX IF NOT EXISTS idx_projects_required_contractors ON projects(required_contractors);

-- 5. 確認用クエリ
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'projects' 
    AND table_schema = 'public'
    AND column_name = 'required_contractors';

-- 6. 既存データの確認
SELECT 
    id, 
    title, 
    required_contractors,
    created_at
FROM projects 
ORDER BY created_at DESC 
LIMIT 5;
