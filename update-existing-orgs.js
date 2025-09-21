const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = 'https://rxnozwuamddqlcwysxag.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

// 作成済みのBOXフォルダID（前回の実行結果）
const orgFolderMapping = {
  'ケセラセラ株式会社': '342185697254',
  '個人事業主（受注者）': '342185072606',
  'デフォルト組織': '342185963899',
  'イースタイルラボ株式会社': '342185178024',
  'デモコンサルタント株式会社': '342186008529',
  'デモ建設株式会社': '342186043191'
}

async function updateExistingOrganizations() {
  try {
    console.log('=== 既存組織データの更新 ===')

    // まず、approval_status カラムが存在するかチェック
    console.log('1. approval_status カラムの確認...')
    const { data: orgsTest, error: testError } = await supabase
      .from('organizations')
      .select('id, name, approval_status')
      .limit(1)

    if (testError && testError.code === '42703') {
      console.log('❌ approval_status カラムが存在しません')
      console.log('Supabaseダッシュボードで以下のSQLを実行してください：')
      console.log(`
-- 組織テーブルにBOXフォルダIDカラムと承認状態管理カラムを追加
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS box_folder_id text,
ADD COLUMN IF NOT EXISTS approval_status text DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS approved_by uuid,
ADD COLUMN IF NOT EXISTS rejection_reason text;

-- 既存データを承認済みに設定
UPDATE public.organizations
SET approval_status = 'approved', approved_at = created_at
WHERE approval_status IS NULL;

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_organizations_box_folder_id ON public.organizations(box_folder_id);
CREATE INDEX IF NOT EXISTS idx_organizations_approval_status ON public.organizations(approval_status);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(active);
      `)
      return
    }

    console.log('✅ approval_status カラムが存在します')

    // 2. 既存組織を取得
    console.log('2. 既存組織データの取得...')
    const { data: organizations, error } = await supabase
      .from('organizations')
      .select('id, name, active, approval_status, box_folder_id')

    if (error) {
      console.error('組織取得エラー:', error)
      return
    }

    console.log(`組織数: ${organizations.length}件`)

    // 3. 各組織のデータを更新
    console.log('3. 組織データの更新...')
    for (const org of organizations) {
      const folderId = orgFolderMapping[org.name]

      console.log(`\n🏢 ${org.name}`)
      console.log(`   現在の状態: approval_status=${org.approval_status}, box_folder_id=${org.box_folder_id}`)

      const updateData = {}
      let needsUpdate = false

      // approval_statusが未設定の場合は承認済みに設定
      if (!org.approval_status) {
        updateData.approval_status = 'approved'
        updateData.approved_at = new Date().toISOString()
        needsUpdate = true
      }

      // BOXフォルダIDが未設定で、作成済みフォルダがある場合は設定
      if (!org.box_folder_id && folderId) {
        updateData.box_folder_id = folderId
        needsUpdate = true
      }

      if (needsUpdate) {
        const { error: updateError } = await supabase
          .from('organizations')
          .update(updateData)
          .eq('id', org.id)

        if (updateError) {
          console.error(`   ❌ 更新エラー:`, updateError)
        } else {
          console.log(`   ✅ 更新完了: ${JSON.stringify(updateData)}`)
        }
      } else {
        console.log(`   ℹ️  更新不要`)
      }
    }

    console.log('\n=== 最終確認 ===')

    // 4. 最終状態を確認
    const { data: finalOrgs, error: finalError } = await supabase
      .from('organizations')
      .select('name, approval_status, box_folder_id, active')
      .order('created_at', { ascending: false })

    if (finalError) {
      console.error('最終確認エラー:', finalError)
      return
    }

    finalOrgs.forEach(org => {
      const boxStatus = org.box_folder_id ? '✅ 連携済み' : '❌ 未連携'
      console.log(`${org.name}: ${org.approval_status} | ${boxStatus} | active: ${org.active}`)
    })

    console.log('\n管理ページで確認してください: http://localhost:3001/admin/organizations')

  } catch (error) {
    console.error('処理エラー:', error)
  }
}

updateExistingOrganizations()