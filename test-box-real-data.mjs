// Node.js 環境で直接 .ts ファイルを実行するためのESMアプローチ
import { getBoxFolderItems } from './src/lib/box.ts'

async function testRealBoxData() {
  try {
    // 実際の組織BOXフォルダIDを使用
    const orgFolderId = '342185697254' // ケセラセラ株式会社

    console.log(`🔍 BOXフォルダ ${orgFolderId} の中身を取得中...`)

    const items = await getBoxFolderItems(orgFolderId)

    console.log(`✅ ${items.length} 件のアイテムが見つかりました:`)

    items.forEach((item, index) => {
      console.log(`${index + 1}. ${item.name} (type: ${item.type}, id: ${item.id})`)
      if (item.type === 'file') {
        console.log(`   サイズ: ${item.size ? (item.size / 1024).toFixed(1) + 'KB' : '不明'}`)
      }
      console.log(`   更新日: ${item.modified_at}`)
    })

    // プロジェクトフォルダがあるかチェック
    const projectFolders = items.filter(item =>
      item.type === 'folder' && item.name.includes('[PRJ-')
    )

    if (projectFolders.length > 0) {
      console.log(`\n📁 プロジェクトフォルダが ${projectFolders.length} 個見つかりました:`)

      for (const projectFolder of projectFolders) {
        console.log(`\n🎯 プロジェクト: ${projectFolder.name} (${projectFolder.id})`)

        try {
          const projectItems = await getBoxFolderItems(projectFolder.id)
          console.log(`   サブフォルダ/ファイル数: ${projectItems.length}`)

          projectItems.forEach(subItem => {
            const icon = subItem.type === 'folder' ? '📁' : '📄'
            console.log(`   ${icon} ${subItem.name}`)
          })
        } catch (error) {
          console.log(`   ❌ プロジェクトフォルダの中身取得に失敗: ${error.message}`)
        }
      }
    } else {
      console.log('\n📁 プロジェクトフォルダは見つかりませんでした')
    }

  } catch (error) {
    console.error('❌ BOXデータ取得エラー:', error.message)
  }
}

testRealBoxData()