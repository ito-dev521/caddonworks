const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInvoiceData() {
  console.log('テスト案件の請求書データを確認します...\n')

  // 契約IDをもとに請求書を取得
  const contractId = 'a0b38c64-166f-4bfa-8474-beae48e5c20a'

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      *,
      contracts (
        id,
        bid_amount,
        support_enabled,
        project:projects (
          id,
          title,
          support_enabled
        )
      )
    `)
    .eq('contract_id', contractId)

  if (error) {
    console.error('エラー:', error)
    return
  }

  console.log('=== テスト案件の請求書データ ===\n')

  if (invoices.length === 0) {
    console.log('この契約に対する請求書がまだ作成されていません。')
  } else {
    invoices.forEach((inv, index) => {
      console.log(`\n請求書 #${index + 1} (ID: ${inv.id})`)
      console.log(`作成日: ${inv.created_at}`)
      console.log(`\n--- 金額の内訳 ---`)
      console.log(`base_amount（契約金額・税込）: ¥${(inv.base_amount || 0).toLocaleString('ja-JP')}`)
      console.log(`fee_amount（サポート料）: ¥${(inv.fee_amount || 0).toLocaleString('ja-JP')}`)
      console.log(`total_amount（小計）: ¥${(inv.total_amount || 0).toLocaleString('ja-JP')}`)
      console.log(`system_fee（源泉徴収税）: ¥${(inv.system_fee || 0).toLocaleString('ja-JP')}`)

      // 計算検証
      console.log(`\n--- 計算検証 ---`)
      const expectedFeeAmount = inv.contracts.support_enabled ? Math.round(inv.contracts.bid_amount * 0.08) : 0
      const projectSupport = inv.contracts.project.support_enabled
      const contractSupport = inv.contracts.support_enabled

      console.log(`プロジェクトサポート: ${projectSupport ? '有効（発注者）' : '無効'}`)
      console.log(`契約サポート: ${contractSupport ? '有効（受注者）' : '無効'}`)

      if (projectSupport && !contractSupport) {
        console.log(`\n判定: 発注者サポート利用`)
        console.log(`→ 受注者の請求書には fee_amount = 0 となるべき`)
        console.log(`実際の fee_amount: ¥${(inv.fee_amount || 0).toLocaleString('ja-JP')}`)
        if (inv.fee_amount !== 0) {
          console.log(`⚠️ 問題: fee_amount が 0 ではありません！`)
        }
      } else if (!projectSupport && contractSupport) {
        console.log(`\n判定: 受注者サポート利用`)
        console.log(`→ 受注者の請求書には fee_amount = サポート料 となるべき`)
        console.log(`期待されるサポート料: ¥${expectedFeeAmount.toLocaleString('ja-JP')}`)
        console.log(`実際の fee_amount: ¥${(inv.fee_amount || 0).toLocaleString('ja-JP')}`)
        if (inv.fee_amount !== expectedFeeAmount) {
          console.log(`⚠️ 問題: fee_amount が期待値と異なります！`)
        }
      } else {
        console.log(`\n判定: サポート利用なし、または両方有効（想定外）`)
      }

      console.log(`\n契約金額: ¥${(inv.contracts.bid_amount || 0).toLocaleString('ja-JP')}`)
      console.log(`サポート料率: 8%`)
      console.log(`サポート料（理論値）: ¥${Math.round((inv.contracts.bid_amount || 0) * 0.08).toLocaleString('ja-JP')}`)
    })
  }
}

checkInvoiceData().then(() => {
  console.log('\n\n確認完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
