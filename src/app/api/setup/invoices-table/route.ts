import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    // invoicesテーブルを作成
    const createTableSQL = `
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
      CREATE POLICY IF NOT EXISTS "contractors_can_view_their_invoices" ON invoices
          FOR SELECT USING (
              contractor_id IN (
                  SELECT id FROM users WHERE auth_user_id = auth.uid()
              )
          );

      -- 発注者（組織管理者）は自分の組織の請求書を閲覧・作成・更新可能
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

      -- システム管理者は全ての請求書を管理可能
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

      -- updated_atの自動更新トリガー
      CREATE OR REPLACE FUNCTION update_invoices_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS update_invoices_updated_at_trigger ON invoices;
      CREATE TRIGGER update_invoices_updated_at_trigger
          BEFORE UPDATE ON invoices
          FOR EACH ROW
          EXECUTE FUNCTION update_invoices_updated_at();
    `

    const { error: createError } = await supabaseAdmin.rpc('exec_sql', { sql: createTableSQL })

    if (createError) {
      console.error('invoicesテーブル作成エラー:', createError)
      return NextResponse.json({ message: 'invoicesテーブルの作成に失敗しました', error: createError }, { status: 500 })
    }

    // テーブル作成後の確認
    const { data: testData, error: testError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .limit(1)

    return NextResponse.json({
      message: 'invoicesテーブルが正常に作成されました',
      testQuery: testError ? { error: testError } : { success: true, data: testData }
    }, { status: 200 })

  } catch (error) {
    console.error('invoicesテーブルセットアップエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
