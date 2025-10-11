import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken, getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

/**
 * 組織フォルダ配下の全プロジェクトフォルダをリストアップ
 */
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  try {
    const accessToken = await getAppAuthAccessToken()

    // 組織フォルダのID
    const orgFolderIds = [
      { id: '342433760835', name: 'イースタイルラボ株式会社' },
      { id: '344511284799', name: 'テスト株式会社' }
    ]

    const allProjects = []

    for (const orgFolder of orgFolderIds) {
      console.log(`\n📁 ${orgFolder.name} のプロジェクトを取得中...`)

      try {
        const items = await getBoxFolderItems(orgFolder.id)
        const projectFolders = items.filter(item => item.type === 'folder')

        console.log(`  ✅ ${projectFolders.length}個のプロジェクトフォルダが見つかりました`)

        for (const project of projectFolders) {
          allProjects.push({
            id: project.id,
            name: project.name,
            orgName: orgFolder.name,
            orgId: orgFolder.id
          })
        }
      } catch (error) {
        console.error(`  ❌ エラー:`, error)
      }
    }

    return NextResponse.json({
      total: allProjects.length,
      projects: allProjects.sort((a, b) => a.name.localeCompare(b.name))
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
