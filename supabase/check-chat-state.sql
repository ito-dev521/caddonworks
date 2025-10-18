-- 橋梁点検スケッチ作業の状態確認

-- 1. プロジェクトの確認
SELECT
  id,
  title,
  status,
  org_id,
  contractor_id,
  created_at
FROM projects
WHERE title LIKE '%橋梁点検スケッチ%'
ORDER BY created_at DESC;

-- 2. そのプロジェクトのチャットルームを確認
SELECT
  cr.id as room_id,
  cr.name,
  cr.is_active,
  cr.project_id,
  p.title as project_title,
  p.status as project_status
FROM chat_rooms cr
LEFT JOIN projects p ON cr.project_id = p.id
WHERE p.title LIKE '%橋梁点検スケッチ%';

-- 3. チャット参加者を確認（auth_user_idベース）
SELECT
  cp.room_id,
  cp.user_id as auth_user_id,
  cp.role as participant_role,
  cp.is_active,
  u.email,
  u.display_name,
  m.role as membership_role
FROM chat_participants cp
LEFT JOIN users u ON cp.user_id = u.auth_user_id
LEFT JOIN memberships m ON u.id = m.user_id
WHERE cp.room_id IN (
  SELECT cr.id
  FROM chat_rooms cr
  LEFT JOIN projects p ON cr.project_id = p.id
  WHERE p.title LIKE '%橋梁点検スケッチ%'
)
ORDER BY u.email;

-- 4. 運営者のauth_user_idを確認
SELECT
  u.id as user_id,
  u.auth_user_id,
  u.email,
  u.display_name,
  m.role as membership_role
FROM users u
LEFT JOIN memberships m ON u.id = m.user_id
WHERE m.role IN ('Admin', 'Reviewer', 'Auditor')
ORDER BY u.email;

-- 5. 契約情報とsupport_enabledを確認
SELECT
  c.id as contract_id,
  c.contract_title,
  c.support_enabled,
  c.project_id,
  c.contractor_id,
  u.email as contractor_email,
  u.auth_user_id as contractor_auth_user_id
FROM contracts c
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN users u ON c.contractor_id = u.id
WHERE p.title LIKE '%橋梁点検スケッチ%';
