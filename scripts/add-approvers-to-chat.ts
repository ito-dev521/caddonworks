/**
 * 既存のチャットルームに案件承認者を参加者として追加する移行スクリプト
 *
 * 実行方法:
 * npx tsx scripts/add-approvers-to-chat.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// 環境変数を読み込み
dotenv.config({ path: '.env.local' })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function addApproversToChat() {
  console.log('既存チャットルームへの承認者追加を開始します...\n')

  try {
    // すべてのチャットルームを取得
    const { data: chatRooms, error: roomsError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id, project_id, name')
      .order('created_at', { ascending: true })

    if (roomsError) {
      console.error('チャットルーム取得エラー:', roomsError)
      return
    }

    console.log(`チャットルーム数: ${chatRooms?.length || 0}\n`)

    let addedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const room of chatRooms || []) {
      console.log(`\n処理中: ${room.name} (Room ID: ${room.id})`)

      // プロジェクトの承認者を取得
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, approved_by, title')
        .eq('id', room.project_id)
        .single()

      if (projectError || !project) {
        console.log(`  ⚠️  プロジェクト情報の取得失敗`)
        errorCount++
        continue
      }

      if (!project.approved_by) {
        console.log(`  ⏭️  承認者が設定されていません`)
        skippedCount++
        continue
      }

      // 承認者のauth_user_idを取得
      const { data: approver, error: approverError } = await supabaseAdmin
        .from('users')
        .select('id, auth_user_id, display_name, email')
        .eq('id', project.approved_by)
        .single()

      if (approverError || !approver || !approver.auth_user_id) {
        console.log(`  ⚠️  承認者情報の取得失敗`)
        errorCount++
        continue
      }

      console.log(`  承認者: ${approver.display_name || approver.email} (ID: ${approver.auth_user_id})`)

      // 既に参加者として登録されているかチェック
      const { data: existingParticipant } = await supabaseAdmin
        .from('chat_participants')
        .select('id, role')
        .eq('room_id', room.id)
        .eq('user_id', approver.auth_user_id)
        .single()

      if (existingParticipant) {
        console.log(`  ✅ 既に参加者として登録済み (role: ${existingParticipant.role})`)
        skippedCount++
        continue
      }

      // 承認者を参加者として追加
      const { error: addError } = await supabaseAdmin
        .from('chat_participants')
        .insert({
          room_id: room.id,
          user_id: approver.auth_user_id,
          role: 'admin',
          is_active: true
        })

      if (addError) {
        console.log(`  ❌ 参加者追加エラー:`, addError.message)
        errorCount++
      } else {
        console.log(`  ✅ 承認者を参加者に追加しました`)
        addedCount++
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('移行完了')
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ 追加: ${addedCount}件`)
    console.log(`⏭️  スキップ: ${skippedCount}件`)
    console.log(`❌ エラー: ${errorCount}件`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  } catch (error) {
    console.error('移行スクリプトエラー:', error)
    process.exit(1)
  }
}

// スクリプト実行
addApproversToChat()
  .then(() => {
    console.log('スクリプト正常終了')
    process.exit(0)
  })
  .catch((error) => {
    console.error('スクリプト異常終了:', error)
    process.exit(1)
  })
