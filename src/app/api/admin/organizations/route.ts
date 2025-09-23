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

    // 組織のみを取得（受注者を除外）
    // approval_statusカラムの存在チェックを行い、存在しない場合はエラーハンドリング
    let organizations: any[] = []
    let orgError: any = null

    try {
      // まず新しいカラムを含めて取得を試行（受注者を除外）
      const { data, error } = await supabaseAdmin
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
        .neq('name', '個人事業主（受注者）')
        .order('created_at', { ascending: false })

      if (error && error.code === '42703') {
        // カラムが存在しない場合は基本カラムのみ取得（受注者を除外）
        const { data: basicData, error: basicError } = await supabaseAdmin
          .from('organizations')
          .select(`
            id,
            name,
            active,
            system_fee,
            created_at,
            billing_email,
            description
          `)
          .neq('name', '個人事業主（受注者）')
          .order('created_at', { ascending: false })

        organizations = basicData || []
        orgError = basicError
      } else {
        organizations = data || []
        orgError = error
      }
    } catch (err) {
      console.error('組織取得エラー:', err)
      orgError = err
    }

    if (orgError) {
      return NextResponse.json({
        message: '組織情報の取得に失敗しました',
        error: orgError?.message || String(orgError)
      }, { status: 500 })
    }

    // approval_statusカラムが存在しない場合のデフォルト値を設定
    const organizationsWithDefaults = (organizations || []).map(org => ({
      ...org,
      approval_status: org.approval_status || 'approved', // 既存データは承認済みとして扱う
      approved_at: org.approved_at || org.created_at, // 承認日が未設定の場合は作成日を使用
      rejection_reason: org.rejection_reason || null
      // box_folder_idは既存の値をそのまま使用（nullに上書きしない）
    }))

    return NextResponse.json({
      organizations: organizationsWithDefaults,
      total: organizationsWithDefaults.length
    }, { status: 200 })

  } catch (error) {
    console.error('組織一覧取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}