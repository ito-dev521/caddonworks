-- notificationsテーブルの存在確認と作成

-- 1. notificationsテーブルが存在するかチェック
SELECT 
    table_name, 
    table_schema
FROM information_schema.tables 
WHERE table_name = 'notifications' 
    AND table_schema = 'public';

-- 2. テーブルが存在しない場合は作成
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

-- 3. 外部キー制約の追加（usersテーブルが存在する場合のみ）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') THEN
        -- 既存の外部キー制約を削除（存在する場合）
        BEGIN
            ALTER TABLE notifications DROP CONSTRAINT fk_notifications_user_id;
        EXCEPTION
            WHEN undefined_object THEN
                -- 制約が存在しない場合は何もしない
                NULL;
        END;
        
        -- 新しい外部キー制約を追加
        BEGIN
            ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id 
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
            RAISE NOTICE 'notificationsテーブルに外部キー制約を追加しました';
        EXCEPTION
            WHEN duplicate_object THEN
                -- 制約が既に存在する場合は何もしない
                RAISE NOTICE '外部キー制約は既に存在します';
        END;
    ELSE
        RAISE NOTICE 'usersテーブルが存在しないため、外部キー制約を追加できません';
    END IF;
END
$$;

-- 4. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- 5. RLSポリシーの設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
    DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
END
$$;

-- 新しいポリシーを作成
DO $$
BEGIN
    -- ユーザーは自分の通知のみ閲覧可能
    BEGIN
        CREATE POLICY "Users can view their own notifications" ON notifications
          FOR SELECT USING (auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = notifications.user_id
          ));
        RAISE NOTICE '通知閲覧ポリシーを作成しました';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '通知閲覧ポリシーは既に存在します';
    END;

    -- ユーザーは自分の通知を更新可能（既読状態など）
    BEGIN
        CREATE POLICY "Users can update their own notifications" ON notifications
          FOR UPDATE USING (auth.uid() IN (
            SELECT auth_user_id FROM users WHERE id = notifications.user_id
          ));
        RAISE NOTICE '通知更新ポリシーを作成しました';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '通知更新ポリシーは既に存在します';
    END;

    -- サービスロールは通知を作成可能
    BEGIN
        CREATE POLICY "Service role can insert notifications" ON notifications
        FOR INSERT WITH CHECK (true);
        RAISE NOTICE '通知作成ポリシーを作成しました';
    EXCEPTION
        WHEN duplicate_object THEN
            RAISE NOTICE '通知作成ポリシーは既に存在します';
    END;
END
$$;

-- 6. テーブル構造の確認
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'notifications' 
    AND table_schema = 'public'
ORDER BY ordinal_position;

-- 7. 既存の通知データを確認
SELECT 
    id,
    user_id,
    type,
    title,
    message,
    read_at,
    created_at
FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
