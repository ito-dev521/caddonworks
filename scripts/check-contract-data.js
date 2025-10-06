// 契約データのproject_idを確認するスクリプト
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkContracts() {
  console.log('契約データを確認中...\n')

  // 契約ID: 48F19408 (画像から)
  const contractId = '48f19408' // UUIDの一部

  // すべての契約を取得して、該当するものを探す
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('id, project_id, contract_title, contractor_id, org_id')
    .ilike('id', `${contractId}%`)

  if (error) {
    console.error('エラー:', error)
    return
  }

  console.log(`契約ID ${contractId}で始まる契約:`, contracts)

  if (contracts && contracts.length > 0) {
    for (const contract of contracts) {
      console.log('\n契約詳細:')
      console.log('  ID:', contract.id)
      console.log('  project_id:', contract.project_id || '❌ NULL')
      console.log('  contract_title:', contract.contract_title)
      console.log('  contractor_id:', contract.contractor_id)
      console.log('  org_id:', contract.org_id)

      if (contract.project_id) {
        // プロジェクトが存在するか確認
        const { data: project, error: pError } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('id', contract.project_id)
          .single()

        if (pError || !project) {
          console.log('  ❌ プロジェクトが見つかりません:', pError?.message)
        } else {
          console.log('  ✅ プロジェクト:', project.title, `(${project.status})`)
        }
      }
    }
  } else {
    console.log('契約が見つかりませんでした')
  }
}

checkContracts().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
