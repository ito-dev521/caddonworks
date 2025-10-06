-- chat_messagesテーブルに必要なカラムを追加

-- message_typeカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'message_type'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image', 'system'));
    END IF;
END $$;

-- file_urlカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'file_url'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- file_nameカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'file_name'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN file_name TEXT;
    END IF;
END $$;

-- file_sizeカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'file_size'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN file_size INTEGER;
    END IF;
END $$;

-- reply_toカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'reply_to'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL;
    END IF;
END $$;

-- edited_atカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'edited_at'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN edited_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- is_deletedカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'is_deleted'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN is_deleted BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- sender_typeカラムを追加（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_messages' 
        AND column_name = 'sender_type'
    ) THEN
        ALTER TABLE chat_messages ADD COLUMN sender_type VARCHAR(20) NOT NULL DEFAULT 'client' CHECK (sender_type IN ('client', 'contractor'));
    END IF;
END $$;





































