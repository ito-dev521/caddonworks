import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

/**
 * Caddon Integrationアプリがアクセスできる全てのBOXフォルダをリストアップ
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

    // ルートフォルダ（0）の内容を取得
    const rootResponse = await fetch(
      'https://api.box.com/2.0/folders/0/items?limit=1000',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!rootResponse.ok) {
      return NextResponse.json({
        error: `ルートフォルダ取得失敗: HTTP ${rootResponse.status}`
      }, { status: 500 })
    }

    const rootData = await rootResponse.json()
    const folders = []

    // 各フォルダの詳細を取得
    for (const item of rootData.entries || []) {
      if (item.type === 'folder') {
        folders.push({
          id: item.id,
          name: item.name,
          path: item.name
        })

        // サブフォルダも取得（1階層のみ）
        try {
          const subResponse = await fetch(
            `https://api.box.com/2.0/folders/${item.id}/items?limit=100`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          )

          if (subResponse.ok) {
            const subData = await subResponse.json()
            for (const subItem of subData.entries || []) {
              if (subItem.type === 'folder') {
                folders.push({
                  id: subItem.id,
                  name: subItem.name,
                  path: `${item.name} > ${subItem.name}`
                })
              }
            }
          }
        } catch (error) {
          console.error(`サブフォルダ取得エラー (${item.name}):`, error)
        }

        await new Promise(resolve => setTimeout(resolve, 200))
      }
    }

    return NextResponse.json({
      total: folders.length,
      folders: folders.sort((a, b) => a.path.localeCompare(b.path))
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
