const { createClient } = require('@supabase/supabase-js')

// 環境変数から直接読み込み
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rxnozwuamddqlcwysxag.supabase.co'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

async function migrateAndCreateFolders() {
  try {
    console.log('=== 1. DBマイグレーション: approval_statusカラムの追加 ===')

    // 1. approval_statusカラムの追加
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })

    if (alterError) {
      console.error('DBマイグレーションエラー:', alterError)
      return
    }

    console.log('✅ DBマイグレーション完了')

    console.log('\n=== 2. 既存組織の取得 ===')

    // 2. 既存組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, active, approval_status, box_folder_id')
      .eq('active', true)
      .is('box_folder_id', null)

    if (orgError) {
      console.error('組織取得エラー:', orgError)
      return
    }

    console.log(`Box フォルダ未作成の組織: ${organizations.length}件`)

    console.log('\n=== 3. 会社フォルダ作成 ===')

    // 3. 各組織の会社フォルダを作成
    for (const org of organizations) {
      console.log(`\n🏢 ${org.name} のフォルダを作成中...`)

      try {
        // フォルダ作成API呼び出し（実際のAPIを呼び出す）
        const response = await fetch('http://localhost:3000/api/box/company-folder', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: org.name })
        })

        if (response.ok) {
          const { folderId } = await response.json()

          // DBに保存
          const { error: updateError } = await supabase
            .from('organizations')
            .update({ box_folder_id: folderId })
            .eq('id', org.id)

          if (updateError) {
            console.error(`   ❌ DB更新エラー:`, updateError)
          } else {
            console.log(`   ✅ フォルダ作成完了: ${folderId}`)
          }
        } else {
          const errorData = await response.text()
          console.log(`   ⚠️ API呼び出し失敗: ${response.status} - ${errorData}`)
        }
      } catch (error) {
        console.error(`   ❌ ${org.name} のフォルダ作成でエラー:`, error.message)
      }

      // API レート制限を避けるため少し待機
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('\n=== 4. 最終確認 ===')

    // 4. 最終結果を確認
    const { data: finalOrgs, error: finalError } = await supabase
      .from('organizations')
      .select('name, approval_status, box_folder_id')
      .order('created_at', { ascending: false })

    if (finalError) {
      console.error('最終確認エラー:', finalError)
      return
    }

    finalOrgs.forEach(org => {
      const status = org.box_folder_id ? '✅ 作成済み' : '❌ 未作成'
      console.log(`${org.name}: ${status} (${org.approval_status})`)
    })

  } catch (error) {
    console.error('処理エラー:', error)
  }
}

migrateAndCreateFolders()