/**
 * Boxのコラボレーション状況を確認するスクリプト
 */

import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { getAppAuthAccessToken } from '../src/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function checkBoxCollaborations() {
  console.log('📋 Boxコラボレーション状況を確認します...\n')

  try {
    // 署名済み契約を取得
    const { data: contracts } = await supabaseAdmin
      .from('contracts')
      .select('id, project_id, contractor_id')
      .eq('status', 'signed')
      .limit(3)

    if (!contracts || contracts.length === 0) {
      console.log('契約が見つかりません')
      return
    }

    // プロジェクト情報を取得
    const projectIds = contracts.map(c => c.project_id)
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .in('id', projectIds)

    if (!projects) return

    const accessToken = await getAppAuthAccessToken()

    for (const contract of contracts) {
      const project = projects.find(p => p.id === contract.project_id)
      if (!project?.box_folder_id) continue

      console.log(`\n=== ${project.title} ===`)
      console.log(`フォルダID: ${project.box_folder_id}`)

      // 受注者情報を取得
      const { data: contractor } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', contract.contractor_id)
        .single()

      if (contractor) {
        console.log(`受注者: ${contractor.display_name} (${contractor.email})`)
      }

      // Boxのコラボレーションを取得
      const response = await fetch(
        `https://api.box.com/2.0/folders/${project.box_folder_id}/collaborations`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        console.log(`\n📁 コラボレーター数: ${data.entries?.length || 0}`)

        if (data.entries && data.entries.length > 0) {
          data.entries.forEach((collab: any) => {
            console.log(`  - ID: ${collab.accessible_by?.id}`)
            console.log(`    Type: ${collab.accessible_by?.type}`)
            console.log(`    Name: ${collab.accessible_by?.name}`)
            console.log(`    Login: ${collab.accessible_by?.login || 'N/A'}`)
            console.log(`    Role: ${collab.role}`)
            console.log(`    Status: ${collab.status}`)
            console.log('')
          })
        }
      } else {
        console.log(`❌ コラボレーション取得エラー: ${response.status}`)
      }
    }

  } catch (error) {
    console.error('エラー:', error)
  }
}

checkBoxCollaborations()
