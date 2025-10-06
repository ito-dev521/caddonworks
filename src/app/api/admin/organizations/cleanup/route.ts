import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
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

    // 管理者権限チェック
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase())
    const isAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

    if (!isAdmin) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    console.log('管理者による組織クリーンアップ開始:', user.email)

    // デモ・テスト用組織を削除
    const deletePatterns = [
      '%デモ%', '%テスト%', '%受注者%', '%個人事業主%',
      '%demo%', '%test%', '%contractor%', '%sample%'
    ]

    let deletedCount = 0
    const deletedOrganizations: any[] = []

    for (const pattern of deletePatterns) {
      try {
        // 削除対象の組織を先に取得
        const { data: toDelete } = await supabaseAdmin
          .from('organizations')
          .select('id, name')
          .ilike('name', pattern)

        if (toDelete && toDelete.length > 0) {
          console.log(`削除対象組織 (${pattern}):`, toDelete.map(o => o.name))

          // 関連データも削除（メンバーシップ、プロジェクトなど）
          for (const org of toDelete) {
            // メンバーシップを削除
            await supabaseAdmin
              .from('memberships')
              .delete()
              .eq('org_id', org.id)

            // プロジェクトを削除
            await supabaseAdmin
              .from('projects')
              .delete()
              .eq('org_id', org.id)

            // 組織を削除
            const { error } = await supabaseAdmin
              .from('organizations')
              .delete()
              .eq('id', org.id)

            if (!error) {
              deletedOrganizations.push(org)
              deletedCount++
            }
          }
        }
      } catch (error) {
        console.error(`パターン ${pattern} の削除エラー:`, error)
      }
    }

    console.log(`組織クリーンアップ完了: ${deletedCount}件削除`)

    return NextResponse.json({
      message: `${deletedCount}件の不要な組織を削除しました`,
      deletedCount,
      deletedOrganizations
    }, { status: 200 })

  } catch (error) {
    console.error('組織クリーンアップAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}