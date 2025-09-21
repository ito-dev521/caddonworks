const { createClient } = require('@supabase/supabase-js')

// 環境変数から直接読み込み
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xofeuvqcbiqocyhuxzrp.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkOrganizations() {
  try {
    console.log('=== 現在のorganizationsテーブルのデータ ===')

    const { data: organizations, error } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        active,
        billing_email,
        description,
        created_at
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('エラー:', error)
      return
    }

    if (!organizations || organizations.length === 0) {
      console.log('組織データが見つかりません')
      return
    }

    console.log('組織数:', organizations.length)
    console.log('\n--- 組織一覧 ---')

    organizations.forEach((org, index) => {
      console.log(`${index + 1}. ${org.name}`)
      console.log(`   ID: ${org.id}`)
      console.log(`   アクティブ: ${org.active}`)
      console.log(`   請求先: ${org.billing_email || 'N/A'}`)
      console.log(`   説明: ${org.description || 'N/A'}`)
      console.log(`   作成日: ${new Date(org.created_at).toLocaleString('ja-JP')}`)
      console.log('')
    })

  } catch (error) {
    console.error('検索エラー:', error)
  }
}

checkOrganizations()