import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // memberships テーブルの制約を確認
    const { data: constraints, error: constraintsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT
            conname as constraint_name,
            pg_get_constraintdef(oid) as constraint_definition
          FROM pg_constraint
          WHERE conrelid = 'memberships'::regclass
          AND contype = 'c'
        `
      })

    if (constraintsError) {
      console.error('制約確認エラー:', constraintsError)
    }

    // memberships テーブルの構造を確認
    const { data: columns, error: columnsError } = await supabaseAdmin
      .rpc('sql', {
        query: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'memberships'
          ORDER BY ordinal_position
        `
      })

    if (columnsError) {
      console.error('カラム確認エラー:', columnsError)
    }

    // 既存のroleの値を確認
    const { data: existingRoles, error: rolesError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .limit(10)

    if (rolesError) {
      console.error('既存ロール確認エラー:', rolesError)
    }

    return NextResponse.json({
      constraints: constraints || [],
      columns: columns || [],
      existingRoles: existingRoles || [],
      errors: {
        constraints: constraintsError,
        columns: columnsError,
        roles: rolesError
      }
    })

  } catch (error) {
    console.error('デバッグAPIエラー:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 })
  }
}