-- チャットメッセージテーブルを作成

-- 既存のテーブルを削除（存在する場合）
DROP TABLE IF EXISTS chat_messages CASCADE;

-- チャットメッセージテーブルを作成
CREATE TABLE chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('client', 'contractor')),
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system')),
    file_url TEXT,
    file_name TEXT,
    file_size INTEGER,
    reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- インデックスを作成
CREATE INDEX idx_chat_messages_project_id ON chat_messages(project_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX idx_chat_messages_reply_to ON chat_messages(reply_to);

-- RLS（Row Level Security）を有効化
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- プロジェクトの参加者（発注者組織のメンバーまたは受注者）のみがメッセージを閲覧可能
CREATE POLICY "Allow project participants to view messages" ON chat_messages
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM projects p
        LEFT JOIN memberships m ON m.org_id = p.org_id
        WHERE p.id = chat_messages.project_id
        AND (
            m.user_id = auth.uid()::text::uuid
            OR p.contractor_id = auth.uid()::text::uuid
        )
    )
);

-- プロジェクトの参加者のみがメッセージを送信可能
CREATE POLICY "Allow project participants to insert messages" ON chat_messages
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM projects p
        LEFT JOIN memberships m ON m.org_id = p.org_id
        WHERE p.id = chat_messages.project_id
        AND (
            m.user_id = auth.uid()::text::uuid
            OR p.contractor_id = auth.uid()::text::uuid
        )
    )
);

-- メッセージ送信者のみがメッセージを更新可能
CREATE POLICY "Allow message sender to update messages" ON chat_messages
FOR UPDATE USING (
    sender_id = auth.uid()::text::uuid
);

-- メッセージ送信者のみがメッセージを削除可能
CREATE POLICY "Allow message sender to delete messages" ON chat_messages
FOR DELETE USING (
    sender_id = auth.uid()::text::uuid
);

-- updated_atを自動更新するトリガー
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_messages_updated_at
    BEFORE UPDATE ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_chat_messages_updated_at();





















