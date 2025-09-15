-- bidsテーブルの制約を修正
-- estimated_durationとstart_dateカラムのNOT NULL制約を削除

-- 1. まず、カラムが存在するかチェック
DO $$
BEGIN
    -- estimated_durationカラムのNOT NULL制約を削除
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bids' 
               AND column_name = 'estimated_duration' 
               AND table_schema = 'public') THEN
        ALTER TABLE bids ALTER COLUMN estimated_duration DROP NOT NULL;
        RAISE NOTICE 'estimated_durationカラムのNOT NULL制約を削除しました';
    ELSE
        RAISE NOTICE 'estimated_durationカラムは存在しません';
    END IF;

    -- start_dateカラムのNOT NULL制約を削除
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bids' 
               AND column_name = 'start_date' 
               AND table_schema = 'public') THEN
        ALTER TABLE bids ALTER COLUMN start_date DROP NOT NULL;
        RAISE NOTICE 'start_dateカラムのNOT NULL制約を削除しました';
    ELSE
        RAISE NOTICE 'start_dateカラムは存在しません';
    END IF;
END
$$;

-- 2. 既存のレコードでNULLの場合は適切なデフォルト値を設定
UPDATE bids 
SET estimated_duration = NULL 
WHERE estimated_duration IS NULL;

UPDATE bids 
SET start_date = NULL 
WHERE start_date IS NULL;

-- 4. 確認用クエリ - カラムの制約を確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'bids' 
    AND table_schema = 'public'
    AND column_name IN ('estimated_duration', 'start_date', 'budget_approved');

-- 5. 既存データの確認
SELECT 
    id, 
    project_id, 
    estimated_duration, 
    start_date, 
    budget_approved,
    created_at
FROM bids 
ORDER BY created_at DESC 
LIMIT 5;
