import { NextRequest, NextResponse } from 'next/server'
import { addFolderCollaboration } from '@/lib/box-collaboration'

export const dynamic = 'force-dynamic'

/**
 * テスト用：単一のフォルダへのコラボレーション追加をテスト
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  try {
    const { folderId, email } = await request.json()

    if (!folderId || !email) {
      return NextResponse.json(
        { message: 'folderIdとemailが必要です' },
        { status: 400 }
      )
    }

    console.log(`テスト: ${email} を ${folderId} に追加`)

    const result = await addFolderCollaboration(
      folderId,
      email,
      'editor',
      'テストフォルダ'
    )

    return NextResponse.json({
      success: result.success,
      collaborationId: result.collaborationId,
      error: result.error
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
