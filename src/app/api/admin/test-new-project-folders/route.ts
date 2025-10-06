import { NextRequest, NextResponse } from 'next/server'
import { createProjectFolderStructure } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Testing new project folder creation with numbered subfolders...')

    // テスト用のプロジェクト情報
    const testProjectTitle = 'テスト案件_番号付きフォルダ'
    const testProjectId = 'test-' + Date.now()

    // イースタイルラボ株式会社のフォルダIDを使用
    const companyFolderId = '342433760835' // イースタイルラボ株式会社

    console.log(`📁 Creating test project: ${testProjectTitle}`)
    console.log(`🏢 Company folder ID: ${companyFolderId}`)

    // プロジェクトフォルダ構造を作成
    const result = await createProjectFolderStructure(
      testProjectTitle,
      testProjectId,
      companyFolderId
    )

    console.log('✅ Test project folder creation completed')

    return NextResponse.json({
      message: 'Test project folder creation completed',
      test_project: {
        title: testProjectTitle,
        id: testProjectId,
        folder_id: result.folderId
      },
      created_subfolders: result.subfolders,
      subfolder_names: {
        '受取': '01_受取データ',
        '作業': '02_作業データ',
        '納品': '03_納品データ',
        '契約': '04_契約データ'
      },
      verification: {
        expected_count: 4,
        actual_count: Object.keys(result.subfolders).length,
        all_created: Object.keys(result.subfolders).length === 4
      }
    })

  } catch (error) {
    console.error('❌ Test project folder creation error:', error)
    return NextResponse.json({
      error: 'Failed to create test project folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}