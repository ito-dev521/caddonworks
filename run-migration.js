const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rxnozwuamddqlcwysxag.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function runMigration() {
  try {
    console.log('=== DBマイグレーション実行中 ===')

    // 手動でSQLを実行
    console.log('1. approval_statusカラムの追加...')
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved';`
    })
    if (error1) console.log('Error1:', error1)

    console.log('2. 制約の追加...')
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.organizations ADD CONSTRAINT IF NOT EXISTS organizations_approval_status_check CHECK (approval_status IN ('pending', 'approved', 'rejected'));`
    })
    if (error2) console.log('Error2:', error2)

    console.log('3. その他のカラム追加...')
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.organizations
        ADD COLUMN IF NOT EXISTS box_folder_id text,
        ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
        ADD COLUMN IF NOT EXISTS approved_by uuid,
        ADD COLUMN IF NOT EXISTS rejection_reason text;
      `
    })
    if (error3) console.log('Error3:', error3)

    console.log('4. 既存データの更新...')
    const { error: error4 } = await supabase
      .from('organizations')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString()
      })
      .is('approval_status', null)

    if (error4) console.log('Error4:', error4)

    console.log('✅ マイグレーション完了')

    // 結果確認
    const { data: orgs, error: checkError } = await supabase
      .from('organizations')
      .select('id, name, approval_status, box_folder_id')
      .limit(3)

    if (checkError) {
      console.error('確認エラー:', checkError)
    } else {
      console.log('\n確認結果:')
      orgs.forEach(org => {
        console.log(`${org.name}: ${org.approval_status}, BOX: ${org.box_folder_id || '未設定'}`)
      })
    }

  } catch (error) {
    console.error('マイグレーションエラー:', error)
  }
}

runMigration()