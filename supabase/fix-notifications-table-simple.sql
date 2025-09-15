-- notificationsテーブルの修正（簡潔版）
-- PostgreSQLの構文エラーを回避

-- 1. notificationsテーブルが存在しない場合は作成
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('bid_received', 'bid_accepted', 'bid_rejected', 'contract_created', 'contract_signed', 'project_completed')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 外部キー制約を追加（エラーハンドリング付き）
DO $$
BEGIN
    -- 既存の制約を削除
    BEGIN
        ALTER TABLE notifications DROP CONSTRAINT fk_notifications_user_id;
    EXCEPTION
        WHEN undefined_object THEN
            NULL; -- 制約が存在しない場合は何もしない
    END;
    
    -- 新しい制約を追加
    BEGIN
        ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    EXCEPTION
        WHEN duplicate_object THEN
            NULL; -- 制約が既に存在する場合は何もしない
    END;
END
$$;

-- 3. インデックスを作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- 4. RLSを有効化
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 5. ポリシーを作成（エラーハンドリング付き）
DO $$
BEGIN
    -- 既存のポリシーを削除
    BEGIN
        DROP POLICY "Users can view their own notifications" ON notifications;
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;
    
    BEGIN
        DROP POLICY "Users can update their own notifications" ON notifications;
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;
    
    BEGIN
        DROP POLICY "Service role can insert notifications" ON notifications;
    EXCEPTION
        WHEN undefined_object THEN
            NULL;
    END;
    
    -- 新しいポリシーを作成
    CREATE POLICY "Users can view their own notifications" ON notifications
      FOR SELECT USING (auth.uid() IN (
        SELECT auth_user_id FROM users WHERE id = notifications.user_id
      ));

    CREATE POLICY "Users can update their own notifications" ON notifications
      FOR UPDATE USING (auth.uid() IN (
        SELECT auth_user_id FROM users WHERE id = notifications.user_id
      ));

    CREATE POLICY "Service role can insert notifications" ON notifications
    FOR INSERT WITH CHECK (true);
    
    RAISE NOTICE 'notificationsテーブルの設定が完了しました';
END
$$;

-- 6. 確認用クエリ
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;
