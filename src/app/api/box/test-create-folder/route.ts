export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createProjectFolderStructure } from '@/lib/box'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing BOX folder creation...')

    const { projectTitle, projectId } = await request.json()

    if (!projectTitle || !projectId) {
      return NextResponse.json({
        message: 'プロジェクトタイトルとIDが必要です'
      }, { status: 400 })
    }

    console.log(`Testing folder creation for: ${projectTitle} (${projectId})`)

    const result = await createProjectFolderStructure(projectTitle, projectId)

    console.log('✅ Test folder creation successful:', result)

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