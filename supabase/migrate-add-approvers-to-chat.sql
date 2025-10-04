-- 既存のチャットルームに案件承認者を参加者として追加する移行SQL
-- Supabaseダッシュボードの SQL Editor で実行してください

DO $$
DECLARE
  room_record RECORD;
  project_record RECORD;
  approver_record RECORD;
  existing_participant_record RECORD;
  added_count INTEGER := 0;
  skipped_count INTEGER := 0;
  error_count INTEGER := 0;
BEGIN
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '承認者をチャットルームに追加する移行処理';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';

  -- すべてのチャットルームをループ
  FOR room_record IN
    SELECT id, project_id, name
    FROM chat_rooms
    ORDER BY created_at
  LOOP
    RAISE NOTICE '処理中: % (Room ID: %)', room_record.name, room_record.id;

    -- プロジェクトの承認者を取得
    BEGIN
      SELECT id, approved_by, title
      INTO project_record
      FROM projects
      WHERE id = room_record.project_id;

      IF NOT FOUND THEN
        RAISE NOTICE '  ⚠️  プロジェクト情報が見つかりません';
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- 承認者が設定されていない場合はスキップ
      IF project_record.approved_by IS NULL THEN
        RAISE NOTICE '  ⏭️  承認者が設定されていません';
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- 承認者のauth_user_idを取得
      SELECT id, auth_user_id, display_name, email
      INTO approver_record
      FROM users
      WHERE id = project_record.approved_by;

      IF NOT FOUND OR approver_record.auth_user_id IS NULL THEN
        RAISE NOTICE '  ⚠️  承認者情報が見つかりません';
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      RAISE NOTICE '  承認者: % (ID: %)',
        COALESCE(approver_record.display_name, approver_record.email),
        approver_record.auth_user_id;

      -- 既に参加者として登録されているかチェック
      SELECT id, role
      INTO existing_participant_record
      FROM chat_participants
      WHERE room_id = room_record.id
        AND user_id = approver_record.auth_user_id;

      IF FOUND THEN
        RAISE NOTICE '  ✅ 既に参加者として登録済み (role: %)', existing_participant_record.role;
        skipped_count := skipped_count + 1;
        CONTINUE;
      END IF;

      -- 承認者を参加者として追加
      INSERT INTO chat_participants (room_id, user_id, role, is_active)
      VALUES (room_record.id, approver_record.auth_user_id, 'admin', true);

      RAISE NOTICE '  ✅ 承認者を参加者に追加しました';
      added_count := added_count + 1;

    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE '  ❌ エラー: %', SQLERRM;
        error_count := error_count + 1;
    END;
  END LOOP;

  -- 結果サマリー
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '移行完了';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ 追加: %件', added_count;
  RAISE NOTICE '⏭️  スキップ: %件', skipped_count;
  RAISE NOTICE '❌ エラー: %件', error_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

END $$;
