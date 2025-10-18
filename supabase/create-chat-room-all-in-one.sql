-- 橋梁点検スケッチ作業のチャットルームを一括作成

-- 1. プロジェクトのステータスを in_progress に更新
UPDATE projects
SET status = 'in_progress'
WHERE id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';

-- 2. チャットルームを作成し、参加者を追加
WITH new_room AS (
  INSERT INTO chat_rooms (project_id, name, description, created_by, is_active)
  VALUES (
    'a6047089-2fab-4d12-aae7-d75c1e6d2b58',
    '橋梁点検スケッチ作業',
    '橋梁点検スケッチ作業のチャットルーム',
    'f8e47909-8ea1-40fc-85fb-06ec5dcff95c', -- 受注者のauth_user_id
    true
  )
  RETURNING id as room_id
),
contractor_participant AS (
  -- 受注者を参加者として追加
  INSERT INTO chat_participants (room_id, user_id, role, is_active)
  SELECT
    room_id,
    'f8e47909-8ea1-40fc-85fb-06ec5dcff95c', -- 受注者のauth_user_id
    'member',
    true
  FROM new_room
  RETURNING *
),
operator_participants AS (
  -- 運営者を参加者として追加
  INSERT INTO chat_participants (room_id, user_id, role, is_active)
  SELECT
    new_room.room_id,
    u.auth_user_id,
    'member',
    true
  FROM new_room
  CROSS JOIN users u
  INNER JOIN memberships m ON u.id = m.user_id
  WHERE m.role IN ('Admin', 'Reviewer', 'Auditor')
    AND u.auth_user_id IS NOT NULL
  RETURNING *
)
SELECT 'チャットルーム作成完了' as status;

-- 3. 確認: 作成されたチャットルームと参加者を表示
SELECT
  cr.id as room_id,
  cr.name,
  cr.is_active,
  COUNT(cp.id) as participant_count
FROM chat_rooms cr
LEFT JOIN chat_participants cp ON cr.id = cp.room_id
WHERE cr.project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58'
GROUP BY cr.id, cr.name, cr.is_active;

-- 4. 参加者の詳細を表示
SELECT
  cp.room_id,
  cp.user_id as auth_user_id,
  cp.role,
  u.email,
  u.display_name
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
WHERE cp.room_id IN (
  SELECT id FROM chat_rooms WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58'
)
ORDER BY u.email;
