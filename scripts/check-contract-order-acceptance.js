const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkContract() {
  console.log('契約「災害査定その２」の状態を確認します...\n')

  const { data: contracts, error } = await supabase
    .from('contracts')
    .select(`
      id,
      status,
      order_acceptance_box_id,
      order_acceptance_number,
      order_acceptance_generated_at,
      order_acceptance_sign_request_id,
      order_acceptance_sign_started_at,
      order_acceptance_signed_at,
      projects!inner(
        id,
        title
      )
    `)
    .ilike('projects.title', '%災害査定その２%')

  if (error) {
    console.error('エラー:', error)
    return
  }

  if (!contracts || contracts.length === 0) {
    console.log('契約が見つかりませんでした')
    return
  }

  const contract = contracts[0]

  console.log('=== 契約の状態 ===')
  console.log('契約ID:', contract.id)
  console.log('プロジェクト:', contract.projects.title)
  console.log('ステータス:', contract.status)
  console.log('')
  console.log('=== 注文請書の状態 ===')
  console.log('order_acceptance_box_id:', contract.order_acceptance_box_id || 'なし（未生成）')
  console.log('order_acceptance_number:', contract.order_acceptance_number || 'なし')
  console.log('order_acceptance_generated_at:', contract.order_acceptance_generated_at || 'なし')
  console.log('')
  console.log('=== 電子署名の状態 ===')
  console.log('sign_request_id:', contract.order_acceptance_sign_request_id || 'なし')
  console.log('sign_started_at:', contract.order_acceptance_sign_started_at || 'なし')
  console.log('signed_at:', contract.order_acceptance_signed_at || 'なし')
  console.log('')

  // 表示されるべきボタンを判定
  console.log('=== ボタン表示判定 ===')
  if (contract.status !== 'signed') {
    console.log('❌ 契約ステータスが "signed" ではないため、注文請書セクションが表示されません')
    console.log(`   現在のステータス: ${contract.status}`)
  } else {
    console.log('✓ 契約ステータスは "signed" です')

    if (!contract.order_acceptance_box_id) {
      console.log('→ 「注文請書を生成」ボタンが表示されるべきです')
    } else if (contract.order_acceptance_box_id && !contract.order_acceptance_sign_request_id) {
      console.log('→ 「署名を依頼」ボタンが表示されるべきです')
    } else if (contract.order_acceptance_sign_request_id && !contract.order_acceptance_signed_at) {
      console.log('→ 「受注者署名待ち」状態です')
    } else if (contract.order_acceptance_signed_at) {
      console.log('→ 「注文請書署名完了」状態です')
    }
  }
}

checkContract().then(() => {
  console.log('\n完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
