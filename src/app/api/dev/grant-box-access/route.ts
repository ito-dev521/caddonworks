import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addFolderCollaboration } from '@/lib/box-collaboration'
import { getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 開発環境専用：既存の署名済み契約に対して受注者にBOXアクセス権限を一括付与する
 *
 * ⚠️ このAPIは開発環境でのみ使用可能です
 */
export async function POST(request: NextRequest) {
  // 開発環境チェック
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  console.log('🚀 既存契約へのBOXアクセス権限付与を開始します...\n')

  try {
    // 署名済みの契約を取得
    const { data: signedContracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('id, project_id, contractor_id')
      .eq('status', 'signed')

    if (contractsError) {
      console.error('契約取得エラー:', contractsError)
      return NextResponse.json(
        { message: '契約の取得に失敗しました', error: contractsError.message },
        { status: 500 }
      )
    }

    if (!signedContracts || signedContracts.length === 0) {
      return NextResponse.json({
        message: '署名済みの契約が見つかりませんでした',
        processed: 0,
        results: []
      }, { status: 200 })
    }

    console.log(`📋 ${signedContracts.length}件の署名済み契約が見つかりました`)

    // プロジェクト情報を別途取得
    const projectIds = signedContracts.map(c => c.project_id)
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .in('id', projectIds)

    if (projectsError || !projects) {
      console.error('プロジェクト取得エラー:', projectsError)
      return NextResponse.json(
        { message: 'プロジェクトの取得に失敗しました', error: projectsError?.message },
        { status: 500 }
      )
    }

    // プロジェクト情報をマッピング
    const projectMap = projects.reduce((acc, project) => {
      acc[project.id] = project
      return acc
    }, {} as Record<string, any>)

    // 契約にプロジェクト情報を結合
    const contractsWithProjects = signedContracts.map(contract => ({
      ...contract,
      projects: projectMap[contract.project_id]
    }))

    // BOXフォルダが設定されている契約のみを対象
    const contractsWithBox = contractsWithProjects.filter(contract =>
      contract.projects?.box_folder_id
    )

    if (contractsWithBox.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが設定された契約が見つかりませんでした',
        processed: 0,
        results: []
      }, { status: 200 })
    }

    console.log(`📁 ${contractsWithBox.length}件の契約にBOXフォルダが設定されています\n`)

    const results: Array<{
      contractId: string
      projectTitle: string
      contractorEmail: string
      success: boolean
      foldersGranted?: number
      error?: string
      mainFolderError?: string
      subfolderErrors?: string[]
    }> = []

    // 各契約の受注者にBOXアクセス権限を付与
    for (let i = 0; i < contractsWithBox.length; i++) {
      const contract = contractsWithBox[i]
      const project = contract.projects as any

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

        let foldersGranted = 0

        // メインプロジェクトフォルダに権限付与（メールアドレスで直接コラボレーション）
        console.log(`   📁 メインフォルダに権限付与中...`)
        const mainFolderResult = await addFolderCollaboration(
          project.box_folder_id,
          contractorInfo.email,
          'editor',
          project.title
        )

        if (mainFolderResult.success) {
          console.log(`   ✅ メインフォルダ: 成功`)
          foldersGranted++
        } else {
          console.log(`   ⚠️ メインフォルダ: ${mainFolderResult.error}`)
          // エラー詳細を結果に含める
          if (!results[results.length - 1]) {
            results.push({
              contractId: contract.id,
              projectTitle: project.title,
              contractorEmail: contractorInfo.email,
              success: false,
              error: `メインフォルダ権限付与失敗: ${mainFolderResult.error}`
            })
            continue
          }
        }

        // サブフォルダにも権限付与（BOXから直接取得）
        console.log(`   📁 サブフォルダ情報をBOXから取得中...`)

        try {
          const items = await getBoxFolderItems(project.box_folder_id)
          const subfolders = items.filter(item => item.type === 'folder')

          console.log(`   📁 ${subfolders.length}個のサブフォルダが見つかりました`)

          for (const subfolder of subfolders) {
            const subfolderResult = await addFolderCollaboration(
              subfolder.id,
              contractorInfo.email,
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

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    const totalFolders = results.reduce((sum, r) => sum + (r.foldersGranted || 0), 0)

    console.log('\n' + '='.repeat(60))
    console.log('📊 処理結果サマリー')
    console.log('='.repeat(60))
    console.log(`✅ 成功: ${successCount}件`)
    console.log(`❌ 失敗: ${failureCount}件`)
    console.log(`📁 付与されたフォルダ数: ${totalFolders}個\n`)

    return NextResponse.json({
      message: `処理完了: ${successCount}件成功、${failureCount}件失敗、合計${totalFolders}個のフォルダに権限付与`,
      processed: contractsWithBox.length,
      successCount,
      failureCount,
      totalFolders,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('BOXアクセス権限一括付与エラー:', error)
    return NextResponse.json(
      {
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
