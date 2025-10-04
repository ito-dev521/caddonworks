-- 小林育英さんを「災害査定その1」のチャットルームに追加する修正SQL
-- このSQLを実行する前に、debug-check-chat-participants.sql で現状を確認してください

-- 方法1: プロジェクトIDを指定して承認者を追加
DO $$
DECLARE
  v_project_id UUID := 'd235e731-4de2-4f50-8e97-3f92413a06c4';
  v_room_id UUID;
  v_approver_auth_user_id UUID;
  v_existing_count INT;
  rec RECORD;
BEGIN
  -- チャットルームIDを取得
  SELECT id INTO v_room_id
  FROM chat_rooms
  WHERE project_id = v_project_id;

  IF v_room_id IS NULL THEN
    RAISE NOTICE '❌ チャットルームが見つかりません';
    RETURN;
  END IF;

  RAISE NOTICE '✓ チャットルームID: %', v_room_id;

  -- 承認者のauth_user_idを取得
  SELECT u.auth_user_id INTO v_approver_auth_user_id
  FROM projects p
  INNER JOIN users u ON p.approved_by = u.id
  WHERE p.id = v_project_id;

  IF v_approver_auth_user_id IS NULL THEN
    RAISE NOTICE '❌ 承認者のauth_user_idが見つかりません';
    RETURN;
  END IF;

  RAISE NOTICE '✓ 承認者のauth_user_id: %', v_approver_auth_user_id;

  -- 既に参加者として登録されているかチェック
  SELECT COUNT(*) INTO v_existing_count
  FROM chat_participants
  WHERE room_id = v_room_id
    AND user_id = v_approver_auth_user_id;

  IF v_existing_count > 0 THEN
    RAISE NOTICE '⚠️  既に参加者として登録されています';
    RETURN;
  END IF;

  -- 参加者として追加
  INSERT INTO chat_participants (room_id, user_id, role, is_active)
  VALUES (v_room_id, v_approver_auth_user_id, 'admin', true);

  RAISE NOTICE '✅ 承認者をチャット参加者に追加しました';

  -- 追加後の参加者一覧を表示
  RAISE NOTICE '';
  RAISE NOTICE '現在の参加者:';
  FOR rec IN
    SELECT u.display_name, u.email, cp.role
    FROM chat_participants cp
    INNER JOIN users u ON cp.user_id = u.auth_user_id
    WHERE cp.room_id = v_room_id
  LOOP
    RAISE NOTICE '  - % (%) - role: %', rec.display_name, rec.email, rec.role;
  END LOOP;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ エラー: %', SQLERRM;
END $$;
