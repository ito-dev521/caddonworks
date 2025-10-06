import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken, getBoxFolderItems, renameBoxFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Renaming Box subfolders to numbered format...')

    const accessToken = await getAppAuthAccessToken()
    const projectsFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID!

    // 1. 全ての会社フォルダを取得
    const companyFolders = await getBoxFolderItems(projectsFolderId)
    const companies = companyFolders.filter(item => item.type === 'folder')

    console.log(`📁 Found ${companies.length} company folders`)

    const renameResults = []

    // 2. 各会社フォルダ内のプロジェクトを処理
    for (const company of companies) {
      console.log(`\n🏢 Processing company: ${company.name}`)

      try {
        // プロジェクトフォルダを取得
        const projectFolders = await getBoxFolderItems(company.id)
        const projects = projectFolders.filter(item => item.type === 'folder')

        console.log(`📁 Found ${projects.length} project folders in ${company.name}`)

        // 各プロジェクトフォルダ内のサブフォルダを処理
        for (const project of projects) {
          console.log(`  📁 Processing project: ${project.name}`)

          try {
            const subFolders = await getBoxFolderItems(project.id)
            const subfolders = subFolders.filter(item => item.type === 'folder')

            console.log(`    📁 Found ${subfolders.length} subfolders`)

            // フォルダ名の変更マッピング
            const renameMapping: Record<string, string> = {
              '受取': '01_受取データ',
              '作業': '02_作業データ',
              '納品': '03_納品データ',
              '契約': '04_契約データ'
            }

            // 各サブフォルダの名前を確認・変更
            for (const subfolder of subfolders) {
              const currentName = subfolder.name
              let targetName = null

              // 現在の名前が変更対象かチェック
              if (renameMapping[currentName]) {
                targetName = renameMapping[currentName]
              } else if (currentName.match(/^\d{2}_/)) {
                // 既に番号付きの場合はスキップ
                console.log(`    ✅ Already formatted: ${currentName}`)
                continue
              } else {
                // その他の名前パターンを確認
                for (const [key, target] of Object.entries(renameMapping)) {
                  if (currentName.includes(key) && !currentName.startsWith('01_') && !currentName.startsWith('02_') && !currentName.startsWith('03_') && !currentName.startsWith('04_')) {
                    targetName = target
                    break
                  }
                }
              }

              if (targetName && targetName !== currentName) {
                try {
                  console.log(`    🔄 Renaming: "${currentName}" → "${targetName}"`)

                  await renameBoxFolder(subfolder.id, targetName)

                  renameResults.push({
                    company: company.name,
                    project: project.name,
                    folder_id: subfolder.id,
                    old_name: currentName,
                    new_name: targetName,
                    status: 'success'
                  })

                  console.log(`    ✅ Renamed successfully`)
                } catch (error: any) {
                  console.error(`    ❌ Rename failed: ${error.message}`)
                  renameResults.push({
                    company: company.name,
                    project: project.name,
                    folder_id: subfolder.id,
                    old_name: currentName,
                    new_name: targetName,
                    status: 'failed',
                    error: error.message
                  })
                }
              } else {
                console.log(`    ⏭️ No rename needed: ${currentName}`)
              }
            }

          } catch (error) {
            console.error(`  ❌ Failed to process project ${project.name}:`, error)
          }
        }

      } catch (error) {
        console.error(`❌ Failed to process company ${company.name}:`, error)
      }
    }

    // 3. 結果の集計
    const stats = {
      total_processed: renameResults.length,
      successful: renameResults.filter(r => r.status === 'success').length,
      failed: renameResults.filter(r => r.status === 'failed').length
    }

    console.log('\n📊 Rename operation completed')
    console.log(`✅ Successful: ${stats.successful}`)
    console.log(`❌ Failed: ${stats.failed}`)

    return NextResponse.json({
      message: 'Subfolder rename operation completed',
      stats,
      results: renameResults,
      target_format: {
        '受取': '01_受取データ',
        '作業': '02_作業データ',
        '納品': '03_納品データ',
        '契約': '04_契約データ'
      }
    })

  } catch (error) {
    console.error('❌ Rename subfolders error:', error)
    return NextResponse.json({
      error: 'Failed to rename subfolders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}