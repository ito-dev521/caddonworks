-- 本番前のテストデータクリーンアップスクリプト（安全版）
-- 注意: 本番環境では実行しないでください

SELECT 'データクリーンアップを開始します' as status;

-- 1. 契約関連データの削除
BEGIN;

-- 存在するテーブルのみクリアする関数
DO $$
DECLARE
    tbl_name text;
    tables_to_clean text[] := ARRAY['contracts', 'bids', 'evaluations', 'invoices', 'completion_reports', 'deliverables'];
BEGIN
    FOREACH tbl_name IN ARRAY tables_to_clean
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl_name);
            RAISE NOTICE '% テーブルをクリアしました', tbl_name;
        ELSE
            RAISE NOTICE '% テーブルは存在しません（スキップ）', tbl_name;
        END IF;
    END LOOP;
END $$;

COMMIT;
SELECT '契約関連データの削除完了' as status;

-- 2. チャット関連データの削除
BEGIN;

DO $$
DECLARE
    tbl_name text;
    chat_tables text[] := ARRAY['chat_messages', 'chat_participants', 'chat_rooms'];
BEGIN
    FOREACH tbl_name IN ARRAY chat_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl_name);
            RAISE NOTICE '% テーブルをクリアしました', tbl_name;
        ELSE
            RAISE NOTICE '% テーブルは存在しません（スキップ）', tbl_name;
        END IF;
    END LOOP;
END $$;

COMMIT;
SELECT 'チャット関連データの削除完了' as status;

-- 3. プロジェクト関連データの削除
BEGIN;

DO $$
DECLARE
    tbl_name text;
    project_tables text[] := ARRAY['memberships', 'projects'];
BEGIN
    FOREACH tbl_name IN ARRAY project_tables
    LOOP
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl_name) THEN
            EXECUTE 'DELETE FROM ' || quote_ident(tbl_name);
            RAISE NOTICE '% テーブルをクリアしました', tbl_name;
        ELSE
            RAISE NOTICE '% テーブルは存在しません（スキップ）', tbl_name;
        END IF;
    END LOOP;
END $$;

COMMIT;
SELECT 'プロジェクト関連データの削除完了' as status;

-- 4. 通知データの削除
BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE 'notifications テーブルをクリアしました';
    ELSE
        RAISE NOTICE 'notifications テーブルは存在しません（スキップ）';
    END IF;
END $$;

COMMIT;
SELECT '通知データの削除完了' as status;

-- 完了メッセージ
SELECT '✅ テストデータのクリーンアップが完了しました' as final_status;
SELECT 'ユーザーアカウントと組織データは保持されています' as note;