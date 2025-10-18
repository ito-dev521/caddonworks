-- 1. プロジェクトのステータスを確認（重要：in_progressでないとチャットが表示されない）
SELECT
  id,
  title,
  status,
  created_at
FROM projects
WHERE id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';

-- 2. チャットルームの存在を確認
SELECT
  id as room_id,
  name,
  is_active,
  created_at
FROM chat_rooms
WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';

-- 3. チャット参加者を確認（受注者のauth_user_idがあるか）
SELECT
  cp.room_id,
  cp.user_id as auth_user_id,
  cp.role as participant_role,
  cp.is_active,
  u.email,
  u.display_name
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id IN (
  SELECT id
  FROM chat_rooms
  WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58'
)
ORDER BY u.email;
