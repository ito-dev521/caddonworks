-- 小林育英さんのチャットルーム参加状況を詳しく確認するSQL

-- 1. 小林育英さんのユーザー情報を確認
SELECT
  id as user_id,
  auth_user_id,
  display_name,
  email
FROM users
WHERE email = 'user@ii-stylelab.com';

-- 2. 小林育英さんのauth_user_idで参加しているチャットルームを確認
SELECT
  cp.id as participant_id,
  cp.room_id,
  cp.user_id as participant_user_id,
  cp.role,
  cp.is_active,
  cr.name as room_name,
  cr.project_id,
  p.title as project_title,
  p.status as project_status
FROM chat_participants cp
INNER JOIN chat_rooms cr ON cp.room_id = cr.id
INNER JOIN projects p ON cr.project_id = p.id
WHERE cp.user_id = (
  SELECT auth_user_id FROM users WHERE email = 'user@ii-stylelab.com'
)
ORDER BY cr.created_at DESC;

-- 3. 災害査定その1のチャットルーム参加者全員を確認
SELECT
  cp.id as participant_id,
  cp.user_id,
  cp.role,
  cp.is_active,
  u.display_name,
  u.email,
  CASE
    WHEN cp.user_id = (SELECT auth_user_id FROM users WHERE email = 'user@ii-stylelab.com')
    THEN '★ 小林育英'
    ELSE ''
  END as is_kobayashi
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id = (
  SELECT id FROM chat_rooms WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
)
ORDER BY cp.id;

-- 4. 小林育英さんが承認した案件のチャットルーム一覧
SELECT
  p.id as project_id,
  p.title,
  p.approved_by,
  p.status,
  cr.id as room_id,
  cr.name as room_name,
  EXISTS (
    SELECT 1
    FROM chat_participants cp
    WHERE cp.room_id = cr.id
      AND cp.user_id = (SELECT auth_user_id FROM users WHERE email = 'user@ii-stylelab.com')
  ) as is_participant
FROM projects p
LEFT JOIN chat_rooms cr ON cr.project_id = p.id
WHERE p.approved_by = (SELECT id FROM users WHERE email = 'user@ii-stylelab.com')
ORDER BY p.created_at DESC;
