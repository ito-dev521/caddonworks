const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkTestProject() {
  console.log('テスト案件の確認を開始します...\n')

  // テスト案件のプロジェクトと契約を確認
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select(`
      id,
      title,
      budget,
      support_enabled,
      contracts (
        id,
        bid_amount,
        support_enabled,
        contractor_id
      )
    `)
    .or('title.ilike.%テスト案件%,title.ilike.%テスト%')
    .order('created_at', { ascending: false })
    .limit(5)

  if (projectError) {
    console.error('エラー:', projectError)
    return
  }

  console.log('=== テスト案件の情報 ===')
  projects.forEach(p => {
    console.log(`\nプロジェクトID: ${p.id}`)
    console.log(`プロジェクト名: ${p.title}`)
    console.log(`予算: ¥${(p.budget || 0).toLocaleString('ja-JP')}`)
    console.log(`プロジェクトサポート: ${p.support_enabled ? '有効' : '無効'}`)

    if (p.contracts && p.contracts.length > 0) {
      p.contracts.forEach(c => {
        console.log(`  契約ID: ${c.id}`)
        console.log(`  契約金額: ¥${(c.bid_amount || 0).toLocaleString('ja-JP')}`)
        console.log(`  契約サポート: ${c.support_enabled ? '有効' : '無効'}`)
        console.log(`  受注者ID: ${c.contractor_id}`)
      })
    } else {
      console.log('  契約なし')
    }
  })

  // システム設定のサポート料率を確認
  console.log('\n\n=== システム設定（サポート料率） ===')
  const { data: settings, error: settingsError } = await supabase
    .from('system_settings')
    .select('*')
    .or('setting_key.ilike.%support%,setting_key.ilike.%fee%')

  if (settingsError) {
    console.error('エラー:', settingsError)
    return
  }

  settings.forEach(s => {
    console.log(`\n設定キー: ${s.setting_key}`)
    console.log(`設定値: ${s.setting_value}`)
    console.log(`説明: ${s.description || 'なし'}`)
  })
}

checkTestProject().then(() => {
  console.log('\n\n確認完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
