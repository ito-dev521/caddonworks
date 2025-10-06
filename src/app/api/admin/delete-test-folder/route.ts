import { NextRequest, NextResponse } from 'next/server'
import { deleteBoxFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Deleting test folder...')

    // テストフォルダのID
    const testFolderId = '343253757267' // テスト案件_番号付きフォルダ

    console.log(`🗑️ Deleting test folder ID: ${testFolderId}`)

    // テストフォルダとその中身を完全削除
    await deleteBoxFolder(testFolderId, true)

    console.log('✅ Test folder deleted successfully')

    return NextResponse.json({
      message: 'Test folder deleted successfully',
      deleted_folder: {
        id: testFolderId,
        name: 'テスト案件_番号付きフォルダ',
        subfolders_deleted: [
          '01_受取データ',
          '02_作業データ',
          '03_納品データ',
          '04_契約データ'
        ]
      }
    })

  } catch (error) {
    console.error('❌ Test folder deletion error:', error)
    return NextResponse.json({
      error: 'Failed to delete test folder',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}