-- 安全な外部キー制約修正（段階的アプローチ）

-- ステップ1: 問題のあるroom_idを特定
WITH problematic_rooms AS (
  SELECT DISTINCT room_id
  FROM chat_messages 
  WHERE room_id IS NOT NULL 
  AND room_id NOT IN (SELECT id FROM chat_rooms WHERE id IS NOT NULL)
)
SELECT 
  '問題のあるroom_id数: ' || COUNT(*) as status
FROM problematic_rooms;

-- ステップ2: 不足しているchat_roomsを作成
WITH missing_rooms AS (
  SELECT DISTINCT 
    cm.room_id,
    cm.project_id,
    COALESCE(p.title, 'チャットルーム ' || SUBSTRING(cm.room_id::text, 1, 8)) as name
  FROM chat_messages cm
  LEFT JOIN projects p ON cm.project_id = p.id
  WHERE cm.room_id IS NOT NULL 
  AND cm.room_id NOT IN (SELECT id FROM chat_rooms WHERE id IS NOT NULL)
)
INSERT INTO chat_rooms (id, project_id, name, description, created_at, updated_at, is_active)
SELECT 
  room_id,
  project_id,
  name,
  '自動生成されたチャットルーム（外部キー制約修正用）' as description,
  NOW() as created_at,
  NOW() as updated_at,
  true as is_active
FROM missing_rooms
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  updated_at = NOW();

-- ステップ3: 外部キー制約を段階的に追加
DO $$ 
DECLARE
  constraint_exists BOOLEAN;
  constraint_added BOOLEAN := FALSE;
BEGIN
  -- 既存の制約をチェック
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'chat_messages' 
    AND constraint_name = 'fk_chat_messages_room_id'
    AND constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
  ) INTO constraint_exists;

  -- 既存の制約を削除
  IF constraint_exists THEN
    ALTER TABLE chat_messages DROP CONSTRAINT fk_chat_messages_room_id;
    RAISE NOTICE '既存の外部キー制約を削除しました';
  END IF;

  -- 新しい制約を追加
  BEGIN
    ALTER TABLE chat_messages 
    ADD CONSTRAINT fk_chat_messages_room_id 
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
    
    constraint_added := TRUE;
    RAISE NOTICE '外部キー制約を正常に追加しました';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '外部キー制約の追加に失敗しました: %', SQLERRM;
      
      -- 失敗した場合、room_idをnullに設定
      UPDATE chat_messages 
      SET room_id = NULL 
      WHERE room_id IS NOT NULL 
      AND room_id NOT IN (SELECT id FROM chat_rooms WHERE id IS NOT NULL);
      
      RAISE NOTICE '問題のあるroom_idをNULLに設定しました';
      
      -- 再度制約を追加
      BEGIN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT fk_chat_messages_room_id 
        FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
        
        constraint_added := TRUE;
        RAISE NOTICE '外部キー制約を再追加しました';
      EXCEPTION
        WHEN OTHERS THEN
          RAISE NOTICE '外部キー制約の再追加にも失敗しました: %', SQLERRM;
      END;
  END;

  -- 結果を報告
  IF constraint_added THEN
    RAISE NOTICE '外部キー制約の修正が完了しました';
  ELSE
    RAISE NOTICE '外部キー制約の修正に失敗しました。手動での対応が必要です。';
  END IF;
END $$;

-- ステップ4: 最終確認
SELECT 
  '修正後のchat_rooms数: ' || COUNT(*) as status
FROM chat_rooms
UNION ALL
SELECT 
  '修正後のchat_messages数: ' || COUNT(*) as status
FROM chat_messages
UNION ALL
SELECT 
  'room_idがNULLのchat_messages数: ' || COUNT(*) as status
FROM chat_messages
WHERE room_id IS NULL;
