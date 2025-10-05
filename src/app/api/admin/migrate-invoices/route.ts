import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

/**
 * invoicesテーブルに月次請求用の列を追加するマイグレーション
 * 運営者のみ実行可能
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseAdmin()

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabase
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 運営者（Admin）のみ実行可能
    if (userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '運営者のみ実行できます' }, { status: 403 })
    }

    const migrations = []

    // 既存の列を確認
    const { data: existingData } = await supabase
      .from('invoices')
      .select('*')
      .limit(1)

    const existingColumns = existingData && existingData.length > 0 ? Object.keys(existingData[0]) : []

    migrations.push({ step: 'check_existing_columns', columns: existingColumns })

    // 必要な列のみを追加（既存の列は base_amount, system_fee, direction があることを確認済み）
    const columnsToAdd = [
      { name: 'billing_year', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_year INTEGER' },
      { name: 'billing_month', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_month INTEGER' },
      { name: 'billing_period', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS billing_period TEXT' },
      { name: 'project_list', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS project_list JSONB' },
      { name: 'memo', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS memo TEXT' },
      { name: 'invoice_number', sql: 'ALTER TABLE invoices ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(100)' },
    ]

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name)) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: col.sql })
          migrations.push({
            step: `add_column_${col.name}`,
            status: error ? 'failed' : 'success',
            error: error?.message
          })
        } catch (e: any) {
          migrations.push({
            step: `add_column_${col.name}`,
            status: 'skipped',
            note: 'RPC not available - use Supabase dashboard'
          })
        }
      } else {
        migrations.push({ step: `add_column_${col.name}`, status: 'already_exists' })
      }
    }


    return NextResponse.json({
      message: 'マイグレーションが完了しました',
      migrations,
      note: 'Supabaseダッシュボードで直接SQLを実行することを推奨します'
    }, { status: 200 })

  } catch (error: any) {
    console.error('マイグレーションエラー:', error)
    return NextResponse.json(
      {
        message: 'マイグレーションに失敗しました',
        error: error.message,
        note: 'Supabaseダッシュボード (https://supabase.com/dashboard) の SQL Editorで以下のファイルの内容を実行してください: supabase/add-monthly-billing-columns.sql'
      },
      { status: 500 }
    )
  }
}
