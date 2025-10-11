#!/usr/bin/env node

/**
 * 既存の署名済み契約の受注者にBOXアクセス権限を一括付与するスクリプト
 *
 * 使い方:
 * node scripts/grant-box-access-to-contractors.js
 */

require('dotenv').config({ path: '.env.local' })

const { createClient } = require('@supabase/supabase-js')

// 動的インポートを使用してESMモジュールを読み込む
async function main() {
  console.log('🚀 既存契約へのBOXアクセス権限付与を開始します...\n')

  try {
    // ESMモジュールを動的にインポート
    const { findOrCreateBoxUser, addFolderCollaboration } = await import('../src/lib/box-collaboration.js')
    const { getBoxFolderItems } = await import('../src/lib/box.js')

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error('❌ 環境変数が設定されていません')
      console.error('必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
      process.exit(1)
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // 署名済みの契約を取得
    const { data: signedContracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        project_id,
        contractor_id,
        projects!contracts_project_id_fkey (
          id,
          title,
          box_folder_id,
          box_subfolders
        )
      `)
      .eq('status', 'signed')

    if (contractsError) {
      throw new Error(`契約取得エラー: ${contractsError.message}`)
    }

    if (!signedContracts || signedContracts.length === 0) {
      console.log('✅ 署名済みの契約が見つかりませんでした')
      return
    }

    console.log(`📋 ${signedContracts.length}件の署名済み契約が見つかりました`)

    // BOXフォルダが設定されている契約のみを対象
    const contractsWithBox = signedContracts.filter(contract => {
      const project = contract.projects
      return project?.box_folder_id
    })

    if (contractsWithBox.length === 0) {
      console.log('✅ BOXフォルダが設定された契約が見つかりませんでした')
      return
    }

    console.log(`📁 ${contractsWithBox.length}件の契約にBOXフォルダが設定されています\n`)

    const results = []

    // 各契約の受注者にBOXアクセス権限を付与
    for (let i = 0; i < contractsWithBox.length; i++) {
      const contract = contractsWithBox[i]
      const project = contract.projects

      console.log(`\n[${i + 1}/${contractsWithBox.length}] 処理中: ${project.title}`)
      console.log(`   契約ID: ${contract.id}`)

      try {
        // 受注者情報を取得
        const { data: contractorInfo, error: contractorError } = await supabaseAdmin
          .from('users')
          .select('email, display_name')
          .eq('id', contract.contractor_id)
          .single()

        if (contractorError || !contractorInfo?.email) {
          throw new Error('受注者情報が見つかりません')
        }

        console.log(`   受注者: ${contractorInfo.display_name} (${contractorInfo.email})`)

        // BOXユーザーを作成または取得
        const boxUserResult = await findOrCreateBoxUser(
          contractorInfo.email,
          contractorInfo.display_name || 'Unknown'
        )

        if (!boxUserResult.success || !boxUserResult.boxUserId) {
          throw new Error(`BOXユーザー作成失敗: ${boxUserResult.error}`)
        }

        console.log(`   ✅ BOXユーザー: ${boxUserResult.boxUserLogin}`)

        let foldersGranted = 0

        // メインプロジェクトフォルダに権限付与
        console.log(`   📁 メインフォルダに権限付与中...`)
        const mainFolderResult = await addFolderCollaboration(
          project.box_folder_id,
          boxUserResult.boxUserId,
          'editor',
          project.title
        )

        if (mainFolderResult.success) {
          console.log(`   ✅ メインフォルダ: 成功`)
          foldersGranted++
        } else {
          console.log(`   ⚠️ メインフォルダ: ${mainFolderResult.error}`)
        }

        // サブフォルダにも権限付与
        if (project.box_subfolders) {
          const subfolders = project.box_subfolders
          console.log(`   📁 サブフォルダに権限付与中 (${Object.keys(subfolders).length}個)...`)

          for (const [folderName, folderId] of Object.entries(subfolders)) {
            if (folderId) {
              const subfolderResult = await addFolderCollaboration(
                folderId,
                boxUserResult.boxUserId,
                'editor',
                `${project.title} - ${folderName}`
              )

              if (subfolderResult.success) {
                console.log(`   ✅ サブフォルダ「${folderName}」: 成功`)
                foldersGranted++
              } else {
                console.log(`   ⚠️ サブフォルダ「${folderName}」: ${subfolderResult.error}`)
              }

              // API Rate Limitを考慮
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
        } else {
          // box_subfoldersがない場合、フォルダ構造を直接取得
          console.log(`   📁 サブフォルダ情報がないため、BOXから直接取得中...`)

          try {
            const items = await getBoxFolderItems(project.box_folder_id)
            const subfolders = items.filter(item => item.type === 'folder')

            console.log(`   📁 ${subfolders.length}個のサブフォルダが見つかりました`)

            for (const subfolder of subfolders) {
              const subfolderResult = await addFolderCollaboration(
                subfolder.id,
                boxUserResult.boxUserId,
                'editor',
                `${project.title} - ${subfolder.name}`
              )

              if (subfolderResult.success) {
                console.log(`   ✅ サブフォルダ「${subfolder.name}」: 成功`)
                foldersGranted++
              } else {
                console.log(`   ⚠️ サブフォルダ「${subfolder.name}」: ${subfolderResult.error}`)
              }

              // API Rate Limitを考慮
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          } catch (folderError) {
            console.log(`   ⚠️ サブフォルダ取得エラー: ${folderError}`)
          }
        }

        results.push({
          contractId: contract.id,
          projectTitle: project.title,
          contractorEmail: contractorInfo.email,
          success: true,
          foldersGranted
        })

        console.log(`   🎉 完了: ${foldersGranted}個のフォルダに権限付与`)

        // 次の契約処理前に待機
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー'
        console.log(`   ❌ エラー: ${errorMessage}`)

        results.push({
          contractId: contract.id,
          projectTitle: project.title,
          contractorEmail: 'unknown',
          success: false,
          error: errorMessage
        })
      }
    }

    // 結果サマリー
    console.log('\n' + '='.repeat(60))
    console.log('📊 処理結果サマリー')
    console.log('='.repeat(60))

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    const totalFolders = results.reduce((sum, r) => sum + (r.foldersGranted || 0), 0)

    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ 失敗: ${failureCount}件`)
    console.log(`📁 付与されたフォルダ数: ${totalFolders}個`)

    if (failureCount > 0) {
      console.log('\n❌ 失敗した契約:')
      results.filter(r => !r.success).forEach(r => {
        console.log(`  - ${r.projectTitle}: ${r.error}`)
      })
    }

    console.log('\n✅ 処理が完了しました！')

  } catch (error) {
    console.error('\n❌ スクリプト実行エラー:', error)
    process.exit(1)
  }
}

main()
