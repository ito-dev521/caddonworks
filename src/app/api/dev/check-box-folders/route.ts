import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * データベースに保存されているBOXフォルダIDが有効かチェック
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  try {
    // BOXフォルダIDが設定されているプロジェクトを取得
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .not('box_folder_id', 'is', null)
      .limit(10)

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが設定されたプロジェクトが見つかりませんでした'
      })
    }

    const accessToken = await getAppAuthAccessToken()
    const results = []

    for (const project of projects) {
      console.log(`\nチェック中: ${project.title} (${project.box_folder_id})`)

      // Boxからフォルダ情報を取得
      const response = await fetch(
        `https://api.box.com/2.0/folders/${project.box_folder_id}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      const isValid = response.ok
      let folderInfo = null
      let error = null

      if (isValid) {
        folderInfo = await response.json()
        console.log(`  ✅ 有効: ${folderInfo.name}`)
      } else {
        error = `HTTP ${response.status}`
        console.log(`  ❌ 無効: ${error}`)
      }

      results.push({
        projectId: project.id,
        projectTitle: project.title,
        boxFolderId: project.box_folder_id,
        isValid,
        folderName: folderInfo?.name,
        error
      })
    }

    const validCount = results.filter(r => r.isValid).length
    const invalidCount = results.filter(r => !r.isValid).length

    return NextResponse.json({
      total: results.length,
      valid: validCount,
      invalid: invalidCount,
      results
    })

  } catch (error) {
    console.error('エラー:', error)
    return NextResponse.json(
      {
        message: 'エラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
