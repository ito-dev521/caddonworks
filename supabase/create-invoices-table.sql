-- 請求書テーブルの作成
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- 金額情報
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.10,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,

    -- 日付情報
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    paid_date TIMESTAMPTZ,

    -- ステータス
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'overdue', 'cancelled')),

    -- 請求書詳細
    description TEXT,
    billing_details JSONB,

    -- メタデータ
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_contractor_id ON invoices(contractor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org_id ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_issue_date ON invoices(issue_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- RLS（行レベルセキュリティ）の有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLSポリシーの作成
-- 受注者は自分宛の請求書のみ閲覧可能
CREATE POLICY "contractors_can_view_their_invoices" ON invoices
    FOR SELECT USING (
        contractor_id = auth.uid() OR
        contractor_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

-- 発注者（組織管理者）は自分の組織の請求書を閲覧・作成・更新可能
CREATE POLICY "org_admins_can_manage_invoices" ON invoices
    FOR ALL USING (
        org_id IN (
            SELECT m.org_id
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid()
            AND m.role = 'OrgAdmin'
        )
    );

-- システム管理者は全ての請求書を管理可能
CREATE POLICY "admins_can_manage_all_invoices" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid()
            AND m.role = 'Admin'
        )
    );

-- updated_atの自動更新トリガー
CREATE OR REPLACE FUNCTION update_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoices_updated_at_trigger
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_invoices_updated_at();