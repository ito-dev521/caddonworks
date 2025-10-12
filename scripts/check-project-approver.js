const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkProjectApprover() {
  console.log('案件「災害査定その2」の承認者を確認します...\n')

  // 案件を検索
  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, title, org_id, approved_by, status')
    .ilike('title', '%災害査定その2%')

  if (projectError) {
    console.error('エラー:', projectError)
    return
  }

  if (!projects || projects.length === 0) {
    console.log('案件が見つかりませんでした')
    return
  }

  for (const project of projects) {
    console.log('=== 案件情報 ===')
    console.log('案件ID:', project.id)
    console.log('案件名:', project.title)
    console.log('組織ID:', project.org_id)
    console.log('ステータス:', project.status)
    console.log('承認者ID:', project.approved_by || 'なし')

    if (project.approved_by) {
      // 承認者情報を取得
      const { data: approver, error: approverError } = await supabase
        .from('users')
        .select('id, display_name, email')
        .eq('id', project.approved_by)
        .single()

      if (!approverError && approver) {
        console.log('\n承認者情報:')
        console.log('  名前:', approver.display_name)
        console.log('  メール:', approver.email)
      }
    }

    // 組織の管理者一覧を取得
    console.log('\n=== この組織の管理者一覧 ===')
    const { data: memberships, error: membershipError } = await supabase
      .from('memberships')
      .select(`
        user_id,
        role,
        users (
          id,
          display_name,
          email
        )
      `)
      .eq('org_id', project.org_id)
      .in('role', ['OrgAdmin', 'Staff'])

    if (!membershipError && memberships) {
      memberships.forEach((m, index) => {
        console.log(`\n管理者 #${index + 1}:`)
        console.log('  ユーザーID:', m.user_id)
        console.log('  名前:', m.users?.display_name)
        console.log('  メール:', m.users?.email)
        console.log('  ロール:', m.role)
        if (m.user_id === project.approved_by) {
          console.log('  ★ この人が承認者です')
        }
      })
    }
  }
}

checkProjectApprover().then(() => {
  console.log('\n\n確認完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
