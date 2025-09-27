-- completion_deliverables関連のエラーを修正するSQL
-- このエラーは存在しないテーブルに対してRLSポリシーが設定されているために発生

-- 1. completion_deliverablesテーブルに関連するポリシーを削除
-- （テーブルが存在しない場合はエラーになるが、ポリシーが残っている可能性がある）

-- 既存のポリシーを削除（エラーを無視）
DO $$
BEGIN
    -- completion_deliverablesテーブルのポリシーを削除
    DROP POLICY IF EXISTS "Completion deliverables inherit completion report permissions" ON completion_deliverables;
    EXCEPTION WHEN undefined_table THEN
        -- テーブルが存在しない場合は何もしない
        NULL;
END $$;

-- 2. completion_deliverablesテーブルが存在する場合は削除
DROP TABLE IF EXISTS completion_deliverables CASCADE;

-- 3. 確認：RLSが有効になっている場合は無効化
DO $$
BEGIN
    ALTER TABLE completion_deliverables DISABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN undefined_table THEN
        -- テーブルが存在しない場合は何もしない
        NULL;
END $$;

-- 4. 状況確認のためのクエリ（実行結果で状況を確認）
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename LIKE '%completion%';

-- 5. テーブル一覧も確認
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%completion%';