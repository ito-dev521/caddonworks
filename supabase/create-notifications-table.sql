-- 通知テーブルの作成
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

-- 外部キー制約の追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE notifications ADD CONSTRAINT fk_notifications_user_id 
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);

-- RLSポリシーの設定
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の通知のみ閲覧可能
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = notifications.user_id
  ));

-- ユーザーは自分の通知を更新可能（既読状態など）
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = notifications.user_id
  ));

-- サービスロールは通知を作成可能
CREATE POLICY "Service role can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- 通知データのサンプル挿入（テスト用）
INSERT INTO notifications (user_id, type, title, message, data) 
SELECT 
  u.id,
  'bid_received',
  '新しい入札が届きました',
  '案件「都市部道路拡張工事設計」に新しい入札が届きました。',
  '{"project_id": "64aee52e-3b67-4ae8-a34b-ef4e3bdddd88", "bid_amount": 4800000, "contractor_name": "サンプル受注者"}'
FROM users u
JOIN memberships m ON u.id = m.user_id
WHERE m.role = 'OrgAdmin'
LIMIT 1;
