-- 必要なテーブルが存在しない場合は作成
-- まず、chat_roomsテーブルを作成（存在しない場合）
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

-- chat_messagesテーブルを作成（存在しない場合）
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

-- usersテーブルを作成（存在しない場合）
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID UNIQUE,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メッセージリアクションテーブルを作成
CREATE TABLE IF NOT EXISTS message_reactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reaction_type VARCHAR(10) NOT NULL, -- 絵文字の種類（例: '👍', '❤️', '😂'）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 同じユーザーが同じメッセージに同じリアクションを複数回つけることを防ぐ
  UNIQUE(message_id, user_id, reaction_type)
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_message_reactions_message_id ON message_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user_id ON message_reactions(user_id);

-- RLSポリシーを設定
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;

-- リアクションの表示権限（チャットルームの参加者のみ）
CREATE POLICY "Users can view reactions in their chat rooms" ON message_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      WHERE cm.id = message_reactions.message_id
      AND (
        cr.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
        OR cr.contractor_id = auth.uid()
      )
    )
  );

-- リアクションの追加権限（チャットルームの参加者のみ）
CREATE POLICY "Users can add reactions in their chat rooms" ON message_reactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_rooms cr ON cm.room_id = cr.id
      WHERE cm.id = message_reactions.message_id
      AND (
        cr.org_id IN (
          SELECT org_id FROM memberships WHERE user_id = auth.uid()
        )
        OR cr.contractor_id = auth.uid()
      )
    )
  );

-- リアクションの削除権限（自分のリアクションのみ）
CREATE POLICY "Users can delete their own reactions" ON message_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- リアクションの更新権限（自分のリアクションのみ）
CREATE POLICY "Users can update their own reactions" ON message_reactions
  FOR UPDATE USING (auth.uid() = user_id);

-- 更新日時の自動更新
CREATE OR REPLACE FUNCTION update_message_reactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_message_reactions_updated_at
  BEFORE UPDATE ON message_reactions
  FOR EACH ROW
  EXECUTE FUNCTION update_message_reactions_updated_at();
