-- 電子契約テーブルの作成
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL,
  contractor_id UUID NOT NULL,
  org_id UUID NOT NULL,
  contract_title VARCHAR(255) NOT NULL,
  contract_content TEXT NOT NULL,
  bid_amount INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending_contractor', 'pending_org', 'signed', 'completed', 'cancelled')),
  contractor_signed_at TIMESTAMP WITH TIME ZONE NULL,
  org_signed_at TIMESTAMP WITH TIME ZONE NULL,
  signed_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 外部キー制約の追加
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_project_id 
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_contractor_id 
            FOREIGN KEY (contractor_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
        ALTER TABLE contracts ADD CONSTRAINT fk_contracts_org_id 
            FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE;
    END IF;
END
$$;

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_contracts_project_id ON contracts(project_id);
CREATE INDEX IF NOT EXISTS idx_contracts_contractor_id ON contracts(contractor_id);
CREATE INDEX IF NOT EXISTS idx_contracts_org_id ON contracts(org_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_created_at ON contracts(created_at);

-- RLSポリシーの設定
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- 発注者は自分の組織の契約を閲覧可能
CREATE POLICY "OrgAdmin can view their organization contracts" ON contracts
  FOR SELECT USING (auth.uid() IN (
    SELECT u.auth_user_id 
    FROM users u 
    JOIN memberships m ON u.id = m.user_id 
    WHERE m.org_id = contracts.org_id AND m.role = 'OrgAdmin'
  ));

-- 受注者は自分の契約を閲覧可能
CREATE POLICY "Contractor can view their contracts" ON contracts
  FOR SELECT USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = contracts.contractor_id
  ));

-- 発注者は自分の組織の契約を作成・更新可能
CREATE POLICY "OrgAdmin can manage their organization contracts" ON contracts
  FOR ALL USING (auth.uid() IN (
    SELECT u.auth_user_id 
    FROM users u 
    JOIN memberships m ON u.id = m.user_id 
    WHERE m.org_id = contracts.org_id AND m.role = 'OrgAdmin'
  ));

-- 受注者は自分の契約を更新可能（署名など）
CREATE POLICY "Contractor can update their contracts" ON contracts
  FOR UPDATE USING (auth.uid() IN (
    SELECT auth_user_id FROM users WHERE id = contracts.contractor_id
  ));

-- サービスロールは契約を作成可能
CREATE POLICY "Service role can insert contracts" ON contracts
  FOR INSERT WITH CHECK (true);
