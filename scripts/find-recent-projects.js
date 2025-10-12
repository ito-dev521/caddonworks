const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function findRecentProjects() {
  console.log('最近の案件を確認します...\n')

  // 最近作成された案件を取得
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, title, org_id, approved_by, status, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  if (projectError) {
    console.error('エラー:', projectError)
    return
  }

  console.log('=== 最近の案件一覧 ===\n')
  projects.forEach((project, index) => {
    console.log(`案件 #${index + 1}:`)
    console.log('  ID:', project.id)
    console.log('  タイトル:', project.title)
    console.log('  ステータス:', project.status)
    console.log('  承認者ID:', project.approved_by || 'なし')
    console.log('  作成日:', project.created_at)
    console.log('')
  })

  // 「災害」を含む案件を検索
  console.log('\n=== 「災害」を含む案件 ===\n')
  const { data: disasterProjects, error: disasterError } = await supabase
    .from('projects')
    .select('id, title, org_id, approved_by, status')
    .or('title.ilike.%災害%,title.ilike.%査定%')
    .order('created_at', { ascending: false })

  if (!disasterError && disasterProjects) {
    for (const project of disasterProjects) {
      console.log('案件ID:', project.id)
      console.log('案件名:', project.title)
      console.log('承認者ID:', project.approved_by || 'なし')

      if (project.approved_by) {
        const { data: approver } = await supabase
          .from('users')
          .select('display_name, email')
          .eq('id', project.approved_by)
          .single()

        if (approver) {
          console.log('承認者:', approver.display_name)
        }
      }
      console.log('')
    }
  }
}

findRecentProjects().then(() => {
  console.log('確認完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
