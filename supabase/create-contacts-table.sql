-- 問い合わせテーブル作成
CREATE TABLE IF NOT EXISTS contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general',
  related_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_type ON contacts(type);
CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_contacts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_contacts_updated_at();

-- RLS（Row Level Security）の設定
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の問い合わせのみ閲覧可能
CREATE POLICY "Users can view their own contacts" ON contacts
    FOR SELECT USING (user_id = auth.uid());

-- ユーザーは自分の問い合わせを作成可能
CREATE POLICY "Users can create their own contacts" ON contacts
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- サービスロールは全ての問い合わせを管理可能
CREATE POLICY "Service role can manage all contacts" ON contacts
    FOR ALL USING (true);
