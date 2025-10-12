const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

// Box APIクライアントを直接インポート（ESModuleではないので動的import不要）
// 代わりにAPIエンドポイントを呼び出す方法を使用

async function cleanupDuplicateFolders() {
  console.log('番号なしフォルダのクリーンアップを開始します...\n')

  // 「災害査定その２」プロジェクトを検索
  const { data: projects, error: searchError } = await supabase
    .from('projects')
    .select('id, title, box_folder_id')
    .ilike('title', '%災害査定その２%')

  if (searchError) {
    console.error('プロジェクト検索エラー:', searchError)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('プロジェクトが見つかりませんでした')
    return
  }

  const project = projects[0]

  console.log('=== クリーンアップ対象プロジェクト ===')
  console.log('プロジェクトID:', project.id)
  console.log('プロジェクト名:', project.title)
  console.log('BoxフォルダID:', project.box_folder_id)
  console.log('')

  if (!project.box_folder_id) {
    console.log('BoxフォルダIDが設定されていません')
    return
  }

  console.log('このプロジェクトのBoxフォルダをチェックします...')
  console.log('手動でBoxにアクセスして、以下のフォルダを削除してください：')
  console.log('- 作業（番号なし）')
  console.log('- 受取（番号なし）')
  console.log('- 契約（番号なし）')
  console.log('- 納品（番号なし）')
  console.log('')
  console.log('削除後、次回プロジェクトにアクセスすると番号付きフォルダのみが表示されます。')
  console.log('')
  console.log(`Boxフォルダへのアクセス: https://app.box.com/folder/${project.box_folder_id}`)
}

cleanupDuplicateFolders().then(() => {
  console.log('\n完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
