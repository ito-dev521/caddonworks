// 既存のBox APIを使用してフォルダを確認
// Next.js環境で実行するため、APIエンドポイント経由でアクセス

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args))

async function listBoxFolders() {
  try {
    console.log('📁 Box APIを使用してプロジェクトフォルダを確認します...')

    // 開発サーバーが動いている前提で、既存のAPIエンドポイントを使用
    const response = await fetch('http://localhost:3000/api/box/folders/342069286897', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 実際の認証トークンが必要ですが、開発中はスキップ
      }
    })

    if (!response.ok) {
      console.log('❌ API経由でのアクセスに失敗しました')
      console.log('手動でBoxコンソールから削除することをお勧めします')
      return
    }

    const data = await response.json()
    console.log('📊 Box フォルダ情報:', data)

  } catch (error) {
    console.log('❌ Box API接続エラー:', error.message)
    console.log('')
    console.log('📋 手動削除の手順:')
    console.log('1. Boxコンソール（https://box.com）にログイン')
    console.log('2. プロジェクトルートフォルダ (ID: 342069286897) に移動')
    console.log('3. テスト用プロジェクトフォルダを手動で削除')
    console.log('')
    console.log('または、以下のコマンドでプロジェクトデータ削除後に')
    console.log('新しいプロジェクトフォルダが自動作成されます:')
    console.log('')
    console.log('psql $DATABASE_URL -f scripts/cleanup-test-data.sql')
  }
}

// 実行
listBoxFolders()
  .then(() => {
    console.log('Box フォルダ確認完了')
  })
  .catch((error) => {
    console.error('エラー:', error)
  })