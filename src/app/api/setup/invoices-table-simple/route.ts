import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // まず、テーブルが存在するかチェック
    const { data: existingData, error: existingError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(1)

    if (!existingError) {
      return NextResponse.json({
        message: 'invoicesテーブルは既に存在します',
        existing: true
      }, { status: 200 })
    }

    // テーブルが存在しない場合、手動でテーブルを作成
    // 注意: この方法はSupabaseの制限により動作しない可能性があります
    // 代わりに、Supabaseダッシュボードで手動実行することを推奨

    return NextResponse.json({
      message: 'invoicesテーブルが存在しません。Supabaseダッシュボードで手動実行してください。',
      sql: `
-- 以下のSQLをSupabaseダッシュボードのSQL Editorで実行してください:

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    tax_rate DECIMAL(5,4) DEFAULT 0.10,
    tax_amount DECIMAL(12,2) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    issue_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    due_date TIMESTAMPTZ NOT NULL,
    paid_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'sent', 'paid', 'overdue', 'cancelled')),
    description TEXT,
    billing_details JSONB,
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

-- RLSの有効化
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY IF NOT EXISTS "contractors_can_view_their_invoices" ON invoices
    FOR SELECT USING (
        contractor_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
    );

CREATE POLICY IF NOT EXISTS "org_admins_can_manage_invoices" ON invoices
    FOR ALL USING (
        org_id IN (
            SELECT m.org_id
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid()
            AND m.role = 'OrgAdmin'
        )
    );

CREATE POLICY IF NOT EXISTS "admins_can_manage_all_invoices" ON invoices
    FOR ALL USING (
        EXISTS (
            SELECT 1
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid()
            AND m.role = 'Admin'
        )
    );
      `
    }, { status: 200 })

  } catch (error) {
    console.error('invoicesテーブルセットアップエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
