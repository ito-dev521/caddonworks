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
 * 既存の署名済み契約に対して受注者にBOXアクセス権限を一括付与する管理API
 * BOX Business plusアップグレード後に実行することを想定
 */
export async function POST(request: NextRequest) {
  try {
    // 管理者権限チェック（運営者のみ実行可能）
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile || userProfile.role !== 'Operator') {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（運営者権限が必要です）' },
        { status: 403 }
      )
    }

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

    // BOXフォルダが設定されている契約のみを対象
    const contractsWithBox = signedContracts.filter(contract => {
      const project = contract.projects as any
      return project?.box_folder_id
    })

    if (contractsWithBox.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが設定された契約が見つかりませんでした',
        processed: 0,
        results: []
      }, { status: 200 })
    }

    console.log(`📁 ${contractsWithBox.length}件の契約にBOXアクセス権限を付与します`)

    const results: Array<{
      contractId: string
      projectTitle: string
      contractorId: string
      success: boolean
      foldersGranted?: number
      error?: string
    }> = []

    // 各契約の受注者にBOXアクセス権限を付与
    for (const contract of contractsWithBox) {
      const project = contract.projects as any

      try {
        console.log(`📁 処理中: ${project.title} (契約ID: ${contract.id})`)

        // 受注者情報を取得
        const { data: contractorInfo, error: contractorError } = await supabaseAdmin
          .from('users')
          .select('email, display_name')
          .eq('id', contract.contractor_id)
          .single()

        if (contractorError || !contractorInfo?.email) {
          console.error(`❌ 受注者情報取得エラー (契約ID: ${contract.id}):`, contractorError)
          results.push({
            contractId: contract.id,
            projectTitle: project.title,
            contractorId: contract.contractor_id,
            success: false,
            error: '受注者情報が見つかりません'
          })
          continue
        }

        console.log(`✅ 受注者メールアドレス: ${contractorInfo.email}`)

        let foldersGranted = 0

        // メインプロジェクトフォルダに権限付与（メールアドレスで直接コラボレーション）
        const mainFolderResult = await addFolderCollaboration(
          project.box_folder_id,
          contractorInfo.email,
          'editor',
          project.title
        )

        if (mainFolderResult.success) {
          console.log(`✅ メインフォルダへの権限付与成功: ${project.title}`)
          foldersGranted++
        } else {
          console.warn(`⚠️ メインフォルダへの権限付与失敗: ${mainFolderResult.error}`)
        }

        // サブフォルダにも権限付与
        if (project.box_subfolders) {
          const subfolders = project.box_subfolders as Record<string, string>

          for (const [folderName, folderId] of Object.entries(subfolders)) {
            if (folderId) {
              const subfolderResult = await addFolderCollaboration(
                folderId,
                contractorInfo.email,
                'editor',
                `${project.title} - ${folderName}`
              )

              if (subfolderResult.success) {
                console.log(`✅ サブフォルダ「${folderName}」への権限付与成功`)
                foldersGranted++
              } else {
                console.warn(`⚠️ サブフォルダ「${folderName}」への権限付与失敗: ${subfolderResult.error}`)
              }

              // API Rate Limitを考慮
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          }
        } else {
          // box_subfoldersがない場合、フォルダ構造を直接取得して権限付与
          try {
            const items = await getBoxFolderItems(project.box_folder_id)
            const subfolders = items.filter(item => item.type === 'folder')

            for (const subfolder of subfolders) {
              const subfolderResult = await addFolderCollaboration(
                subfolder.id,
                contractorInfo.email,
                'editor',
                `${project.title} - ${subfolder.name}`
              )

              if (subfolderResult.success) {
                console.log(`✅ サブフォルダ「${subfolder.name}」への権限付与成功`)
                foldersGranted++
              } else {
                console.warn(`⚠️ サブフォルダ「${subfolder.name}」への権限付与失敗: ${subfolderResult.error}`)
              }

              // API Rate Limitを考慮
              await new Promise(resolve => setTimeout(resolve, 300))
            }
          } catch (folderError) {
            console.error(`❌ サブフォルダ取得エラー (契約ID: ${contract.id}):`, folderError)
          }
        }

        results.push({
          contractId: contract.id,
          projectTitle: project.title,
          contractorId: contract.contractor_id,
          success: true,
          foldersGranted
        })

        console.log(`✅ 成功: ${project.title} -> ${foldersGranted}個のフォルダに権限付与`)

        // 次の契約処理前に待機
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        console.error(`❌ BOXアクセス権限付与エラー (契約ID: ${contract.id}):`, error)
        results.push({
          contractId: contract.id,
          projectTitle: project.title,
          contractorId: contract.contractor_id,
          success: false,
          error: error instanceof Error ? error.message : '不明なエラー'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length
    const totalFolders = results.reduce((sum, r) => sum + (r.foldersGranted || 0), 0)

    return NextResponse.json({
      message: `処理完了: ${successCount}件成功、${failureCount}件失敗、合計${totalFolders}個のフォルダに権限付与`,
      processed: contractsWithBox.length,
      successCount,
      failureCount,
      totalFolders,
      results
    }, { status: 200 })

  } catch (error) {
    console.error('BOXアクセス権限一括付与APIエラー:', error)
    return NextResponse.json(
      {
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
