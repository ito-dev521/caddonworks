-- チャットルームが存在するか確認
SELECT
  id as room_id,
  name,
  is_active,
  created_at
FROM chat_rooms
WHERE project_id = 'a6047089-2fab-4d12-aae7-d75c1e6d2b58';
