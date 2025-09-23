export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createProjectFolderStructure } from '@/lib/box'

export async function POST(request: NextRequest) {
  try {
    const { projectTitle, projectId } = await request.json()

    if (!projectTitle || !projectId) {
      return NextResponse.json({
        message: 'プロジェクトタイトルとIDが必要です'
      }, { status: 400 })
    }

    const result = await createProjectFolderStructure(projectTitle, projectId, '342185697254')

    return NextResponse.json({
      message: 'テストフォルダが作成されました',
      result: result
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Test folder creation failed:', error)

    return NextResponse.json({
      message: 'フォルダ作成テストに失敗しました',
      error: error.message,
      details: error.status ? `HTTP ${error.status}` : 'Unknown error'
    }, { status: 500 })
  }
}