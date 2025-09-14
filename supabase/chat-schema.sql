-- チャット機能のデータベーススキーマ

-- 1. チャットルーム（案件ベース）
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT true
);

-- 2. チャット参加者
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member', -- 'owner', 'admin', 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(room_id, user_id)
);

-- 3. チャットメッセージ
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'file', 'image', 'system'
  file_url TEXT,
  file_name TEXT,
  file_size INTEGER,
  reply_to UUID REFERENCES chat_messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE
);

-- 4. チャット添付ファイル
CREATE TABLE IF NOT EXISTS chat_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 未読メッセージ管理
CREATE TABLE IF NOT EXISTS chat_unread_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, message_id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_chat_rooms_project_id ON chat_rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_unread_messages_user_room ON chat_unread_messages(user_id, room_id);

-- RLS (Row Level Security) ポリシー

-- チャットルーム
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat rooms they participate in" ON chat_rooms
  FOR SELECT USING (
    id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Project owners can create chat rooms" ON chat_rooms
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects
      WHERE created_by = auth.uid()
    )
  );

-- チャット参加者
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in their chat rooms" ON chat_participants
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Room admins can manage participants" ON chat_participants
  FOR ALL USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- チャットメッセージ
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their chat rooms" ON chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Participants can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    room_id IN (
      SELECT room_id FROM chat_participants
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "Users can update their own messages" ON chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- 未読メッセージ
ALTER TABLE chat_unread_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own unread messages" ON chat_unread_messages
  FOR ALL USING (user_id = auth.uid());

-- 関数: チャットルーム作成時の自動参加者追加
CREATE OR REPLACE FUNCTION create_chat_room_with_participants(
  p_project_id UUID,
  p_room_name VARCHAR(255),
  p_description TEXT DEFAULT NULL,
  p_additional_participants UUID[] DEFAULT ARRAY[]::UUID[]
) RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_project_creator UUID;
  v_participant UUID;
BEGIN
  -- プロジェクト作成者を取得
  SELECT created_by INTO v_project_creator
  FROM projects
  WHERE id = p_project_id;

  -- チャットルームを作成
  INSERT INTO chat_rooms (project_id, name, description, created_by)
  VALUES (p_project_id, p_room_name, p_description, auth.uid())
  RETURNING id INTO v_room_id;

  -- 作成者を管理者として追加
  INSERT INTO chat_participants (room_id, user_id, role)
  VALUES (v_room_id, auth.uid(), 'owner');

  -- プロジェクト作成者を追加（作成者と異なる場合）
  IF v_project_creator != auth.uid() THEN
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES (v_room_id, v_project_creator, 'admin');
  END IF;

  -- 追加参加者を追加
  FOREACH v_participant IN ARRAY p_additional_participants
  LOOP
    INSERT INTO chat_participants (room_id, user_id, role)
    VALUES (v_room_id, v_participant, 'member')
    ON CONFLICT (room_id, user_id) DO NOTHING;
  END LOOP;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: 未読メッセージカウント
CREATE OR REPLACE FUNCTION get_unread_message_count(p_user_id UUID, p_room_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_last_read_at TIMESTAMP WITH TIME ZONE;
  v_unread_count INTEGER;
BEGIN
  -- 最後に読んだ時刻を取得
  SELECT last_read_at INTO v_last_read_at
  FROM chat_participants
  WHERE user_id = p_user_id AND room_id = p_room_id;

  -- 未読メッセージ数を計算
  SELECT COUNT(*)
  INTO v_unread_count
  FROM chat_messages
  WHERE room_id = p_room_id
    AND created_at > COALESCE(v_last_read_at, '1970-01-01'::timestamp)
    AND sender_id != p_user_id
    AND is_deleted = false;

  RETURN COALESCE(v_unread_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 関数: メッセージ既読マーク
CREATE OR REPLACE FUNCTION mark_messages_as_read(p_room_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_participants
  SET last_read_at = NOW()
  WHERE user_id = auth.uid() AND room_id = p_room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;