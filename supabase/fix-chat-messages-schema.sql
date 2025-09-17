-- chat_messagesテーブルのスキーマを修正

-- 1. messageカラムをcontentカラムにリネーム
DO $$ 
BEGIN
  -- messageカラムが存在し、contentカラムが存在しない場合
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'message'
    AND table_schema = 'public'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'content'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages RENAME COLUMN message TO content;
  END IF;
END $$;

-- 2. sender_typeカラムを削除（不要なカラム）
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'sender_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages DROP COLUMN sender_type;
  END IF;
END $$;

-- 3. room_idカラムがnullのレコードを更新（既存のproject_idを使用）
UPDATE chat_messages 
SET room_id = project_id 
WHERE room_id IS NULL AND project_id IS NOT NULL;

-- 4. インデックスを再作成
DROP INDEX IF EXISTS idx_chat_messages_room_id;
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);

DROP INDEX IF EXISTS idx_chat_messages_created_at;
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

-- 5. RLSポリシーを再設定
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;

-- 新しいポリシーを作成
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true);

-- 6. 外部キー制約を確認・修正
-- room_idの外部キー制約を追加（存在しない場合）
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE table_name = 'chat_messages' 
    AND constraint_name LIKE '%room_id%'
    AND constraint_type = 'FOREIGN KEY'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages 
    ADD CONSTRAINT fk_chat_messages_room_id 
    FOREIGN KEY (room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
  END IF;
END $$;
