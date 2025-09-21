const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rxnozwuamddqlcwysxag.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function checkAdminUsers() {
  try {
    console.log('=== 管理者ユーザーの確認 ===')

    // 1. usersテーブルから全ユーザーを取得（roleカラムが存在しない場合に備えて）
    const { data: allUsers, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name, created_at')
      .limit(10)

    if (userError) {
      console.error('ユーザー取得エラー:', userError)
      return
    }

    if (!allUsers || allUsers.length === 0) {
      console.log('❌ ユーザーが見つかりません')
      return
    }

    console.log(`✅ 登録ユーザー: ${allUsers.length}人`)

    allUsers.forEach((user, index) => {
      console.log(`\n${index + 1}. ${user.display_name || 'Unknown'}`)
      console.log(`   メール: ${user.email}`)
      console.log(`   登録日: ${new Date(user.created_at).toLocaleDateString('ja-JP')}`)
    })

    // 管理者メールアドレスの確認
    const adminEmails = ['ito.dev@ii-stylelab.com', 'admin@example.com']
    const isAdminUser = allUsers.find(user => adminEmails.includes(user.email))

    if (isAdminUser) {
      console.log(`\n✅ 管理者用メールアドレスを発見: ${isAdminUser.email}`)
    } else {
      console.log('\n⚠️ 設定済み管理者メールが見つかりません')
      console.log('管理者メール設定:', adminEmails.join(', '))
    }

    console.log('\n=== ログイン手順 ===')
    console.log('1. http://localhost:3001/auth/login にアクセス')
    console.log('2. 上記の管理者メールアドレスでログイン')
    console.log('3. http://localhost:3001/admin/organizations にアクセス')

  } catch (error) {
    console.error('確認エラー:', error)
  }
}

checkAdminUsers()