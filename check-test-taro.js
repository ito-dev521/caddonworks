import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// .env.localファイルから環境変数を読み込む
const envFile = readFileSync('.env.local', 'utf-8')
const envVars = {}
envFile.split('\n').forEach(line => {
  const [key, ...values] = line.split('=')
  if (key && values.length) {
    envVars[key.trim()] = values.join('=').trim()
  }
})

const supabaseAdmin = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkTestTaro() {
  console.log('=== テスト太郎 (iis001@ii-stylelab.com) の情報 ===\n')

  // ユーザー情報取得
  const { data: user, error: userError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('email', 'iis001@ii-stylelab.com')
    .maybeSingle()

  if (userError) {
    console.error('ユーザー取得エラー:', userError)
    return
  }

  if (!user) {
    console.log('ユーザーが見つかりません')
    return
  }

  console.log('【ユーザー基本情報】')
  console.log('ID:', user.id)
  console.log('メール:', user.email)
  console.log('表示名:', user.display_name)
  console.log('正式名:', user.formal_name)
  console.log('会員レベル:', user.member_level || '未設定')
  console.log('経験年数:', user.experience_years || '未設定')
  console.log('専門分野:', user.specialties || '未設定')
  console.log('usersテーブルのrole:', user.role || '未設定')
  console.log()

  // メンバーシップ情報取得
  const { data: memberships, error: membershipError } = await supabaseAdmin
    .from('memberships')
    .select(`
      role,
      org_id,
      organizations (
        name
      )
    `)
    .eq('user_id', user.id)

  if (membershipError) {
    console.error('メンバーシップ取得エラー:', membershipError)
  } else {
    console.log('【メンバーシップ情報】')
    if (memberships && memberships.length > 0) {
      memberships.forEach((m, i) => {
        console.log(`メンバーシップ ${i + 1}:`)
        console.log('  組織:', m.organizations?.name)
        console.log('  ロール:', m.role)
      })
    } else {
      console.log('メンバーシップなし')
    }
  }

  console.log()

  // 会員レベル計算
  const { calculateMemberLevel } = await import('./src/lib/member-level.ts')
  const calculatedLevel = calculateMemberLevel(user.experience_years || 0, user.specialties || [])
  console.log('【レベル計算結果】')
  console.log('計算された会員レベル:', calculatedLevel)
  console.log('(経験年数:', user.experience_years || 0, '年、専門分野数:', (user.specialties || []).length, ')')
}

checkTestTaro()
