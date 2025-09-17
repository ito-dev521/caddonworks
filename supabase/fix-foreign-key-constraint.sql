-- 外部キー制約エラーを修正

-- 1. まず、chat_messagesテーブルのroom_idが参照しているproject_idを確認
-- 存在しないroom_idを持つchat_messagesレコードを特定
SELECT DISTINCT room_id, project_id 
FROM chat_messages 
WHERE room_id IS NOT NULL 
AND room_id NOT IN (SELECT id FROM chat_rooms);

-- 2. 不足しているchat_roomsレコードを作成
-- chat_messagesのroom_idに基づいてchat_roomsを作成
INSERT INTO chat_rooms (id, project_id, name, description, created_at, updated_at, is_active)
SELECT DISTINCT 
  cm.room_id,
  cm.project_id,
  COALESCE(p.title, 'チャットルーム ' || cm.room_id::text) as name,
  '自動生成されたチャットルーム' as description,
  NOW() as created_at,
  NOW() as updated_at,
  true as is_active
FROM chat_messages cm
LEFT JOIN projects p ON cm.project_id = p.id
WHERE cm.room_id IS NOT NULL 
AND cm.room_id NOT IN (SELECT id FROM chat_rooms)
ON CONFLICT (id) DO NOTHING;

-- 3. 外部キー制約を追加（今度は成功するはず）
DO $$ 
BEGIN
  -- 既存の外部キー制約を削除（存在する場合）
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'chat_messages' 
    AND constraint_name = 'fk_chat_messages_room_id'
    AND constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages DROP CONSTRAINT fk_chat_messages_room_id;
  END IF;

  -- 新しい外部キー制約を追加
  ALTER TABLE chat_messages 
  ADD CONSTRAINT fk_chat_messages_room_id 
  FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
  
  RAISE NOTICE '外部キー制約を正常に追加しました';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '外部キー制約の追加に失敗しました: %', SQLERRM;
END $$;

-- 4. 結果を確認
SELECT 
  'chat_rooms' as table_name,
  COUNT(*) as record_count
FROM chat_rooms
UNION ALL
SELECT 
  'chat_messages' as table_name,
  COUNT(*) as record_count
FROM chat_messages;

-- 5. 外部キー制約が正しく設定されているか確認
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'chat_messages'
  AND tc.table_schema = 'public';
