-- 小林育英さんを災害査定その1のチャットに強制追加する簡潔なSQL

-- まず小林育英さんのauth_user_idを確認
SELECT
  'ユーザー情報' as check_type,
  id,
  auth_user_id,
  display_name,
  email
FROM users
WHERE email = 'user@ii-stylelab.com';

-- チャットルームIDを確認
SELECT
  'チャットルーム情報' as check_type,
  id as room_id,
  name,
  project_id
FROM chat_rooms
WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4';

-- 現在の参加者を確認
SELECT
  '現在の参加者' as check_type,
  cp.id,
  cp.user_id,
  u.display_name,
  u.email,
  cp.role,
  cp.is_active
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id = (
  SELECT id FROM chat_rooms WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
);

-- 小林育英さんを追加（既に存在する場合はエラーになります）
INSERT INTO chat_participants (room_id, user_id, role, is_active)
SELECT
  cr.id,
  u.auth_user_id,
  'admin',
  true
FROM chat_rooms cr
CROSS JOIN users u
WHERE cr.project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
  AND u.email = 'user@ii-stylelab.com'
  AND NOT EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.room_id = cr.id
      AND cp.user_id = u.auth_user_id
  );

-- 追加後の参加者を確認
SELECT
  '追加後の参加者' as check_type,
  cp.id,
  cp.user_id,
  u.display_name,
  u.email,
  cp.role,
  cp.is_active
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id = (
  SELECT id FROM chat_rooms WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
)
ORDER BY cp.id;
