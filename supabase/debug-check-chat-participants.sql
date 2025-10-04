-- チャット参加者のデータを確認するデバッグSQL

-- 1. 災害査定その1のプロジェクト情報を確認
SELECT
  p.id as project_id,
  p.title,
  p.approved_by,
  u.id as approver_user_id,
  u.auth_user_id as approver_auth_user_id,
  u.display_name as approver_name,
  u.email as approver_email
FROM projects p
LEFT JOIN users u ON p.approved_by = u.id
WHERE p.id = 'd235e731-4de2-4f50-8e97-3f92413a06c4';

-- 2. このプロジェクトのチャットルームを確認
SELECT
  cr.id as room_id,
  cr.name as room_name,
  cr.project_id,
  cr.created_at
FROM chat_rooms cr
WHERE cr.project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4';

-- 3. このチャットルームの参加者を確認
SELECT
  cp.id as participant_id,
  cp.room_id,
  cp.user_id,
  cp.role,
  cp.is_active,
  u.display_name,
  u.email,
  cr.name as room_name
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
LEFT JOIN chat_rooms cr ON cp.room_id = cr.id
WHERE cr.project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
ORDER BY cp.id;

-- 4. 小林育英さんのユーザー情報を確認
SELECT
  id as user_id,
  auth_user_id,
  display_name,
  email
FROM users
WHERE display_name LIKE '%小林%' OR email LIKE '%小林%';

-- 5. 小林育英さんが参加しているチャットルームを確認
SELECT
  cr.id as room_id,
  cr.name as room_name,
  cr.project_id,
  p.title as project_title,
  cp.role,
  cp.is_active
FROM chat_participants cp
INNER JOIN chat_rooms cr ON cp.room_id = cr.id
INNER JOIN projects p ON cr.project_id = p.id
INNER JOIN users u ON cp.user_id = u.auth_user_id
WHERE u.email = 'user@ii-stylelab.com'  -- 小林育英さんのメールアドレス
ORDER BY cr.created_at DESC;
