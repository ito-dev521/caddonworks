-- 本番前のテストデータクリーンアップスクリプト
-- 注意: 本番環境では実行しないでください

-- 実行前の確認
SELECT 'データクリーンアップを開始します' as status;

-- 1. 契約関連データの削除
BEGIN;

-- 契約データを削除
DELETE FROM contracts;
SELECT 'contracts テーブルをクリアしました' as status;

-- 入札データを削除
DELETE FROM bids;
SELECT 'bids テーブルをクリアしました' as status;

-- 評価データを削除（テーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'evaluations') THEN
        DELETE FROM evaluations;
        RAISE NOTICE 'evaluations テーブルをクリアしました';
    ELSE
        RAISE NOTICE 'evaluations テーブルは存在しません（スキップ）';
    END IF;
END $$;

-- 請求書データを削除
DELETE FROM invoices;
SELECT 'invoices テーブルをクリアしました' as status;

-- 完了報告書データを削除
DELETE FROM completion_reports;
SELECT 'completion_reports テーブルをクリアしました' as status;

-- 納品物データを削除
DELETE FROM deliverables;
SELECT 'deliverables テーブルをクリアしました' as status;

COMMIT;
SELECT '契約関連データの削除完了' as status;

-- 2. チャット関連データの削除
BEGIN;

-- チャットメッセージを削除
DELETE FROM chat_messages;
SELECT 'chat_messages テーブルをクリアしました' as status;

-- チャット参加者を削除
DELETE FROM chat_participants;
SELECT 'chat_participants テーブルをクリアしました' as status;

-- チャットルームを削除
DELETE FROM chat_rooms;
SELECT 'chat_rooms テーブルをクリアしました' as status;

COMMIT;
SELECT 'チャット関連データの削除完了' as status;

-- 3. プロジェクト関連データの削除
BEGIN;

-- プロジェクトメンバーシップを削除
DELETE FROM memberships;
SELECT 'memberships テーブルをクリアしました' as status;

-- プロジェクトを削除
DELETE FROM projects;
SELECT 'projects テーブルをクリアしました' as status;

COMMIT;
SELECT 'プロジェクト関連データの削除完了' as status;

-- 4. 通知データの削除
BEGIN;

-- 通知を削除
DELETE FROM notifications;
SELECT 'notifications テーブルをクリアしました' as status;

COMMIT;
SELECT '通知データの削除完了' as status;

-- 5. シーケンスのリセット
-- プライマリキーのシーケンスをリセット（必要に応じて）
-- ALTER SEQUENCE projects_id_seq RESTART WITH 1;
-- ALTER SEQUENCE contracts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE bids_id_seq RESTART WITH 1;

-- 完了メッセージ
SELECT '✅ テストデータのクリーンアップが完了しました' as message;
SELECT 'ユーザーアカウントと組織データは保持されています' as note;