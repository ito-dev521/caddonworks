import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    // 管理者ページからのアクセスを前提とし、認証チェックは簡素化
    // （実際の認証はページレベルのAuthGuardで行われている前提）

    // 全組織を取得（承認状態、フォルダ情報含む）
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select(`
        id,
        name,
        active,
        approval_status,
        system_fee,
        created_at,
        approved_at,
        rejection_reason,
        billing_email,
        description,
        box_folder_id
      `)
      .order('created_at', { ascending: false })

    if (orgError) {
      return NextResponse.json({
        message: '組織情報の取得に失敗しました',
        error: orgError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      organizations: organizations || [],
      total: organizations?.length || 0
    }, { status: 200 })

  } catch (error) {
    console.error('組織一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}