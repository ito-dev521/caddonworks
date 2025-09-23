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
    // 既存のロールを確認
    const { data: existingMemberships, error: existingError } = await supabaseAdmin
      .from('memberships')
      .select('role, user_id, org_id')
      .limit(20)

    // 異なるロール値でテストを試してみる
    const testRoles = ['OrgAdmin', 'Staff', 'Contractor', 'Reviewer', 'Auditor']
    const testResults = []

    for (const role of testRoles) {
      try {
        // 実際にinsertを試すのではなく、select でサポートされているかチェック
        const { data, error } = await supabaseAdmin
          .from('memberships')
          .select('role')
          .eq('role', role)
          .limit(1)

        testResults.push({
          role,
          supported: !error,
          error: error?.message
        })
      } catch (e) {
        testResults.push({
          role,
          supported: false,
          error: e instanceof Error ? e.message : '不明なエラー'
        })
      }
    }

    return NextResponse.json({
      existingMemberships: existingMemberships || [],
      testResults,
      existingError
    })

  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : '不明なエラー'
    }, { status: 500 })
  }
}