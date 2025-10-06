import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 completion_reports テーブルセットアップ開始...')

    // 管理者認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: '認証に失敗しました' }, { status: 401 })
    }

    // completion_reportsテーブル作成SQL
    const createTableSQL = `
      -- 業務完了届テーブル作成
      CREATE TABLE IF NOT EXISTS completion_reports (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
        contractor_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

        -- 基本情報
        report_number VARCHAR(50) UNIQUE,
        submission_date DATE DEFAULT CURRENT_DATE,
        actual_completion_date DATE NOT NULL,

        -- ステータス管理
        status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),

        -- デジタル署名情報
        box_sign_request_id VARCHAR,
        contractor_signed_at TIMESTAMP WITH TIME ZONE,
        org_signed_at TIMESTAMP WITH TIME ZONE,
        approved_at TIMESTAMP WITH TIME ZONE,

        -- 署名済み完了届のBox file ID
        signed_document_id VARCHAR,

        -- メタデータ
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

        -- 制約：1つのプロジェクトに対して1つの完了届のみ
        UNIQUE(project_id)
      );

      -- RLSを有効化
      ALTER TABLE completion_reports ENABLE ROW LEVEL SECURITY;

      -- 受注者は自分の完了届を管理可能
      CREATE POLICY IF NOT EXISTS "Contractors can manage their completion reports" ON completion_reports
        FOR ALL USING (
          contractor_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
          )
        );

      -- 発注者は自分の組織の完了届を閲覧・承認可能
      CREATE POLICY IF NOT EXISTS "Org admins can view and approve completion reports" ON completion_reports
        FOR ALL USING (
          org_id IN (
            SELECT m.org_id FROM memberships m
            JOIN users u ON u.id = m.user_id
            WHERE u.auth_user_id = auth.uid() AND (m.role = 'OrgAdmin' OR m.role = 'Staff')
          )
        );
    `

    // 管理用Supabaseクライアントで直接SQL実行を試みる
    const { data, error } = await supabaseAdmin.rpc('exec_sql', {
      sql: createTableSQL
    })

    if (error) {
      console.log('❌ テーブル作成失敗 via exec_sql:', error.message)

      return NextResponse.json({
        message: 'テーブル作成に失敗しました',
        error: error.message,
        suggestion: `Supabaseダッシュボードで手動実行してください:\n\n${createTableSQL}`
      }, { status: 500 })
    }

    console.log('✅ completion_reports テーブル作成成功')

    return NextResponse.json({
      message: 'completion_reports テーブルを作成しました',
      data: data
    })

  } catch (error: any) {
    console.error('❌ テーブルセットアップエラー:', error)
    return NextResponse.json({
      error: error.message || 'Unknown error',
      message: 'テーブルセットアップに失敗しました'
    }, { status: 500 })
  }
}