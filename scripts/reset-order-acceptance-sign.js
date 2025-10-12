const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function resetOrderAcceptanceSign() {
  // 契約ID（「災害査定その２」の契約）を検索
  const { data: contracts, error: searchError } = await supabase
    .from('contracts')
    .select(`
      id,
      order_acceptance_sign_request_id,
      order_acceptance_sign_started_at,
      order_acceptance_signed_at,
      projects!inner(
        id,
        title
      )
    `)
    .ilike('projects.title', '%災害査定その２%')

  if (searchError) {
    console.error('契約検索エラー:', searchError)
    return
  }

  if (!contracts || contracts.length === 0) {
    console.log('契約が見つかりませんでした')
    return
  }

  const contract = contracts[0]

  console.log('=== リセット対象契約 ===')
  console.log('契約ID:', contract.id)
  console.log('プロジェクト:', contract.projects.title)
  console.log('現在の状態:')
  console.log('  sign_request_id:', contract.order_acceptance_sign_request_id)
  console.log('  sign_started_at:', contract.order_acceptance_sign_started_at)
  console.log('  signed_at:', contract.order_acceptance_signed_at)

  // 署名リクエスト情報をリセット
  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      order_acceptance_sign_request_id: null,
      order_acceptance_sign_started_at: null,
      order_acceptance_signed_at: null
    })
    .eq('id', contract.id)

  if (updateError) {
    console.error('更新エラー:', updateError)
    return
  }

  console.log('\n✅ 署名リクエスト情報をリセットしました')
  console.log('これで再度「署名を依頼」ボタンを押せます')
}

resetOrderAcceptanceSign().then(() => {
  console.log('\n完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
