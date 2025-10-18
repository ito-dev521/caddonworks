-- チャットルーム「橋梁点検スケッチ作業」の状態を確認

-- 1. チャットルームの存在確認
SELECT
  cr.id as room_id,
  cr.name,
  cr.project_id,
  cr.is_active,
  p.title as project_title,
  c.id as contract_id,
  c.contractor_id,
  c.support_enabled
FROM chat_rooms cr
LEFT JOIN projects p ON cr.project_id = p.id
LEFT JOIN contracts c ON c.project_id = p.id
WHERE cr.name LIKE '%橋梁点検スケッチ%'
   OR p.title LIKE '%橋梁点検スケッチ%';

-- 2. このチャットルームの参加者一覧
SELECT
  cp.room_id,
  cp.user_id,
  cp.role as participant_role,
  cp.is_active,
  u.email,
  u.display_name,
  m.role as membership_role
FROM chat_participants cp
JOIN users u ON cp.user_id = u.auth_user_id
LEFT JOIN memberships m ON u.id = m.user_id
WHERE cp.room_id IN (
  SELECT cr.id
  FROM chat_rooms cr
  LEFT JOIN projects p ON cr.project_id = p.id
  WHERE cr.name LIKE '%橋梁点検スケッチ%'
     OR p.title LIKE '%橋梁点検スケッチ%'
);

-- 3. 受注者のauth_user_idを確認
SELECT
  u.id as user_id,
  u.auth_user_id,
  u.email,
  u.display_name,
  c.id as contract_id,
  c.contract_title,
  c.support_enabled
FROM users u
JOIN contracts c ON c.contractor_id = u.id
WHERE c.contract_title LIKE '%橋梁点検スケッチ%';
