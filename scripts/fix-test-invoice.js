const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixTestInvoice() {
  console.log('テスト案件の請求書を修正します...\n')

  const invoiceId = '59ac4fd1-ef15-45cd-a10c-54b31d6c1bf9'

  // 修正前のデータを確認
  console.log('=== 修正前 ===')
  const { data: before, error: beforeError } = await supabase
    .from('invoices')
    .select('id, base_amount, fee_amount, total_amount, system_fee')
    .eq('id', invoiceId)
    .single()

  if (beforeError) {
    console.error('エラー:', beforeError)
    return
  }

  console.log('base_amount:', before.base_amount)
  console.log('fee_amount:', before.fee_amount)
  console.log('total_amount:', before.total_amount, '← 間違い！')
  console.log('system_fee:', before.system_fee)

  // 修正実行
  console.log('\n修正を実行中...')
  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      total_amount: 3000,
      system_fee: 0
    })
    .eq('id', invoiceId)

  if (updateError) {
    console.error('更新エラー:', updateError)
    return
  }

  // 修正後のデータを確認
  console.log('\n=== 修正後 ===')
  const { data: after, error: afterError } = await supabase
    .from('invoices')
    .select('id, base_amount, fee_amount, total_amount, system_fee')
    .eq('id', invoiceId)
    .single()

  if (afterError) {
    console.error('エラー:', afterError)
    return
  }

  console.log('base_amount:', after.base_amount)
  console.log('fee_amount:', after.fee_amount)
  console.log('total_amount:', after.total_amount, '← 修正完了！')
  console.log('system_fee:', after.system_fee)

  // 計算確認
  console.log('\n=== 計算確認 ===')
  console.log('契約金額（税込）:', after.base_amount)
  console.log('サポート料:', after.fee_amount)
  console.log('小計:', after.total_amount)
  const withholding = after.total_amount < 1000000
    ? Math.floor(after.total_amount * 0.1021)
    : Math.floor((after.total_amount - 1000000) * 0.2042 + 102100)
  console.log('源泉徴収税 (10.21%):', withholding)
  console.log('請求額:', after.total_amount - withholding)
}

fixTestInvoice().then(() => {
  console.log('\n修正完了')
  process.exit(0)
}).catch(err => {
  console.error('エラーが発生しました:', err)
  process.exit(1)
})
