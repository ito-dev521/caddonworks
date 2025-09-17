-- チャットテーブルの修正とカラム追加

-- 1. chat_roomsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  is_active BOOLEAN DEFAULT true
);

-- 2. chat_messagesテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text',
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to UUID REFERENCES chat_messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE
);

-- 3. 既存のchat_messagesテーブルにroom_idカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'room_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN room_id UUID;
  END IF;
END $$;

-- 4. 既存のchat_messagesテーブルにsender_idカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'sender_id'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN sender_id UUID;
  END IF;
END $$;

-- 5. 既存のchat_messagesテーブルにmessage_typeカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'message_type'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(50) DEFAULT 'text';
  END IF;
END $$;

-- 6. 既存のchat_messagesテーブルにfile_urlカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'file_url'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN file_url TEXT;
  END IF;
END $$;

-- 7. 既存のchat_messagesテーブルにfile_nameカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'file_name'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN file_name TEXT;
  END IF;
END $$;

-- 8. 既存のchat_messagesテーブルにfile_sizeカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'file_size'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN file_size INTEGER;
  END IF;
END $$;

-- 9. 既存のchat_messagesテーブルにreply_toカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'reply_to'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN reply_to UUID REFERENCES chat_messages(id);
  END IF;
END $$;

-- 10. 既存のchat_messagesテーブルにis_deletedカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'is_deleted'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 11. 既存のchat_messagesテーブルにedited_atカラムが存在しない場合は追加
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'chat_messages' 
    AND column_name = 'edited_at'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

-- 12. usersテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. message_reactionsテーブルを作成
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(message_id, user_id, reaction_type)
);

-- 14. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_chat_rooms_project_id ON chat_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- 15. RLSポリシーを設定
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 基本的なRLSポリシー（開発用）
DROP POLICY IF EXISTS "Allow all operations on chat_rooms" ON chat_rooms;
CREATE POLICY "Allow all operations on chat_rooms" ON chat_rooms FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on message_reactions" ON message_reactions;
CREATE POLICY "Allow all operations on message_reactions" ON message_reactions FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow all operations on users" ON users;
CREATE POLICY "Allow all operations on users" ON users FOR ALL USING (true);
