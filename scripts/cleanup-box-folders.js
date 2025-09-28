// 環境変数を手動で設定（テスト用）
if (!process.env.BOX_PROJECTS_ROOT_FOLDER_ID) {
  process.env.BOX_PROJECTS_ROOT_FOLDER_ID = '342069286897'
}
if (!process.env.BOX_CLIENT_ID) {
  process.env.BOX_CLIENT_ID = 'jac5va3v32chli4biniryhh5hjgeoi85'
}
if (!process.env.BOX_CLIENT_SECRET) {
  process.env.BOX_CLIENT_SECRET = 'ampStWdgoOC1e7L9L7AOTWcmZzz8Ieds'
}
if (!process.env.BOX_ENTERPRISE_ID) {
  process.env.BOX_ENTERPRISE_ID = '1344510016'
}

// Box APIクライアントを直接作成
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function getAppAuthAccessToken() {
  // Box App Auth トークンを取得
  const response = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.BOX_CLIENT_ID,
      client_secret: process.env.BOX_CLIENT_SECRET,
      box_subject_type: 'enterprise',
      box_subject_id: process.env.BOX_ENTERPRISE_ID
    })
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Box token error: ${data.error_description}`)
  }

  return data.access_token
}

async function getBoxFolderItems(folderId) {
  const token = await getAppAuthAccessToken()

  const response = await fetch(`https://api.box.com/2.0/folders/${folderId}/items`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(`Box API error: ${data.message}`)
  }

  return data.entries
}

async function deleteBoxFolder(folderId) {
  const token = await getAppAuthAccessToken()

  const response = await fetch(`https://api.box.com/2.0/folders/${folderId}?recursive=true`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  if (!response.ok && response.status !== 404) {
    const data = await response.json()
    throw new Error(`Box delete error: ${data.message}`)
  }

  return true
}

async function cleanupBoxFolders() {
  try {
    console.log('📁 Boxプロジェクトフォルダのクリーンアップを開始します...')

    // プロジェクトルートフォルダIDを取得
    const projectsRootFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID

    if (!projectsRootFolderId) {
      console.error('❌ BOX_PROJECTS_ROOT_FOLDER_ID が設定されていません')
      return
    }

    console.log(`📋 プロジェクトルートフォルダ (${projectsRootFolderId}) の内容を確認中...`)

    // プロジェクトルートフォルダの中身を取得
    const folderItems = await getBoxFolderItems(projectsRootFolderId)

    console.log(`📊 発見されたアイテム数: ${folderItems.length}`)

    // フォルダのみを抽出
    const projectFolders = folderItems.filter(item => item.type === 'folder')

    console.log(`📁 プロジェクトフォルダ数: ${projectFolders.length}`)

    if (projectFolders.length === 0) {
      console.log('✅ 削除対象のプロジェクトフォルダはありません')
      return
    }

    // 各プロジェクトフォルダを表示
    console.log('\n📋 発見されたプロジェクトフォルダ:')
    projectFolders.forEach((folder, index) => {
      console.log(`  ${index + 1}. ${folder.name} (ID: ${folder.id})`)
    })

    // 確認プロンプト（本番では削除）
    console.log('\n⚠️  警告: 以下のフォルダをすべて削除します')
    console.log('本番環境では実行しないでください！')

    // すべてのプロジェクトフォルダを削除
    let deletedCount = 0
    let errorCount = 0

    for (const folder of projectFolders) {
      try {
        console.log(`🗑️  削除中: ${folder.name} (ID: ${folder.id})`)
        await deleteBoxFolder(folder.id)
        deletedCount++
        console.log(`✅ 削除完了: ${folder.name}`)

        // API制限を避けるために少し待機
        await new Promise(resolve => setTimeout(resolve, 1000))

      } catch (error) {
        console.error(`❌ 削除エラー: ${folder.name} - ${error.message}`)
        errorCount++
      }
    }

    console.log('\n📊 削除結果:')
    console.log(`✅ 削除成功: ${deletedCount} フォルダ`)
    console.log(`❌ 削除失敗: ${errorCount} フォルダ`)

    if (deletedCount > 0) {
      console.log('✅ Boxプロジェクトフォルダのクリーンアップが完了しました')
    }

  } catch (error) {
    console.error('❌ Boxフォルダクリーンアップエラー:', error)
    throw error
  }
}

// メイン実行部分
if (require.main === module) {
  cleanupBoxFolders()
    .then(() => {
      console.log('Boxフォルダクリーンアップ完了')
      process.exit(0)
    })
    .catch((error) => {
      console.error('エラー:', error)
      process.exit(1)
    })
}

module.exports = { cleanupBoxFolders }