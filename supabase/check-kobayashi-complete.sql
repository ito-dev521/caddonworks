-- 小林育英さんの完全なデータ確認SQL

-- 1. 小林育英さんのユーザー情報（usersテーブル）
SELECT
  '1. ユーザー情報' as step,
  id,
  auth_user_id,
  email,
  display_name
FROM users
WHERE email = 'user@ii-stylelab.com';

-- 2. 小林育英さんが承認した案件
SELECT
  '2. 承認した案件' as step,
  p.id as project_id,
  p.title,
  p.status,
  p.approved_by,
  CASE
    WHEN p.approved_by = (SELECT id FROM users WHERE email = 'user@ii-stylelab.com')
    THEN '✓ 小林が承認者'
    ELSE '✗ 他の人が承認者'
  END as is_approver
FROM projects p
WHERE p.approved_by = (SELECT id FROM users WHERE email = 'user@ii-stylelab.com')
ORDER BY p.created_at DESC;

-- 3. 災害査定その1のチャットルーム
SELECT
  '3. 災害査定その1のチャットルーム' as step,
  id as room_id,
  name,
  project_id,
  is_active,
  created_at
FROM chat_rooms
WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4';

-- 4. 災害査定その1のチャット参加者（全員）
SELECT
  '4. チャット参加者' as step,
  cp.id as participant_id,
  cp.user_id,
  cp.role,
  cp.is_active,
  u.email,
  u.display_name,
  CASE
    WHEN u.email = 'user@ii-stylelab.com'
    THEN '★★★ 小林育英 ★★★'
    ELSE ''
  END as highlight
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id = (
  SELECT id FROM chat_rooms WHERE project_id = 'd235e731-4de2-4f50-8e97-3f92413a06c4'
)
ORDER BY
  CASE WHEN u.email = 'user@ii-stylelab.com' THEN 0 ELSE 1 END,
  cp.id;

-- 5. 小林育英さんが参加している全チャットルーム
SELECT
  '5. 小林が参加中のチャット' as step,
  cr.id as room_id,
  cr.name as room_name,
  p.title as project_title,
  p.status as project_status,
  cp.role,
  cp.is_active
FROM chat_participants cp
INNER JOIN chat_rooms cr ON cp.room_id = cr.id
INNER JOIN projects p ON cr.project_id = p.id
WHERE cp.user_id = (
  SELECT auth_user_id FROM users WHERE email = 'user@ii-stylelab.com'
)
ORDER BY cr.created_at DESC;

-- 6. APIで使用されるクエリと同じ条件でテスト
SELECT
  '6. API条件でのテスト' as step,
  cr.id as room_id,
  cr.name,
  p.title as project_title,
  p.status as project_status,
  COUNT(DISTINCT cp2.id) as participant_count
FROM chat_participants cp
INNER JOIN chat_rooms cr ON cp.room_id = cr.id
INNER JOIN projects p ON cr.project_id = p.id
LEFT JOIN chat_participants cp2 ON cp2.room_id = cr.id
WHERE cp.user_id = (SELECT auth_user_id FROM users WHERE email = 'user@ii-stylelab.com')
GROUP BY cr.id, cr.name, p.title, p.status
ORDER BY cr.created_at DESC;
