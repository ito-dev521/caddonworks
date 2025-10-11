import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createCompanyFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 既存の承認済み法人に一括でBOXフォルダを割り当てる管理API
 * BOX Business plusアップグレード後に実行することを想定
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック（運営者のみ実行可能）
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile || userProfile.role !== 'Operator') {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（運営者権限が必要です）' },
        { status: 403 }
      )
    }

    // BOXフォルダIDが未設定の承認済み法人を取得
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, box_folder_id, approval_status, active')
      .is('box_folder_id', null)
      .eq('active', true)
      .eq('approval_status', 'approved')

    if (orgError) {
      console.error('組織取得エラー:', orgError)
      return NextResponse.json(
        { message: '組織の取得に失敗しました', error: orgError.message },
        { status: 500 }
      )
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが未割り当ての承認済み法人は見つかりませんでした',
        processed: 0,
        results: []
      }, { status: 200 })
    }

    console.log(`📁 ${organizations.length}件の法人にBOXフォルダを割り当てます`)

    const results: Array<{
      organizationId: string
      organizationName: string
      success: boolean
      boxFolderId?: string
      error?: string
    }> = []

    // 各法人にBOXフォルダを作成して割り当て
    for (const org of organizations) {
      try {
        console.log(`📁 処理中: ${org.name} (ID: ${org.id})`)

        // BOXフォルダを作成
        const { id: boxFolderId } = await createCompanyFolder(org.name)

        // データベースに保存
        const { error: updateError } = await supabaseAdmin
          .from('organizations')
          .update({ box_folder_id: boxFolderId })
          .eq('id', org.id)

        if (updateError) {
          console.error(`❌ BOXフォルダID保存エラー (${org.name}):`, updateError)
          results.push({
            organizationId: org.id,
            organizationName: org.name,
            success: false,
            error: `データベース更新エラー: ${updateError.message}`
          })
        } else {
          console.log(`✅ 成功: ${org.name} -> BOXフォルダID: ${boxFolderId}`)
          results.push({
            organizationId: org.id,
            organizationName: org.name,
            success: true,
            boxFolderId: boxFolderId
          })
        }

        // API Rate Limitを考慮して少し待機（BOX APIの制限を回避）
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ BOXフォルダ作成エラー (${org.name}):`, error)
        results.push({
          organizationId: org.id,
          organizationName: org.name,
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `処理完了: ${successCount}件成功、${failureCount}件失敗`,
      processed: organizations.length,
      successCount,
      failureCount,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('BOXフォルダ一括割り当てAPIエラー:', error)
    return NextResponse.json(
      {
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
