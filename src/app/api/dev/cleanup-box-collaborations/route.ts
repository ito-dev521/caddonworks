import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppAuthAccessToken, getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 開発環境専用：既存のApp Userベースのコラボレーションをクリーンアップして
 * メールアドレスベースで再作成する
 */
export async function POST(request: NextRequest) {
  // 開発環境チェック
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  console.log('🧹 Boxコラボレーションのクリーンアップを開始します...\n')

  try {
    // BOXフォルダIDが設定されているプロジェクトを取得
    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .not('box_folder_id', 'is', null)
      .limit(3) // テストのため最初の3件のみ

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが設定されたプロジェクトが見つかりませんでした'
      }, { status: 200 })
    }

    console.log(`📁 ${projects.length}件のプロジェクトを処理します`)

    const projectIds = projects.map(p => p.id)

    // 署名済みの契約を取得
    const { data: signedContracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select('id, project_id, contractor_id')
      .eq('status', 'signed')
      .in('project_id', projectIds)

    if (contractsError || !signedContracts || signedContracts.length === 0) {
      return NextResponse.json({
        message: '契約が見つかりませんでした',
        error: contractsError?.message
      }, { status: 200 })
    }

    const projectMap = projects.reduce((acc, p) => {
      acc[p.id] = p
      return acc
    }, {} as Record<string, any>)

    const accessToken = await getAppAuthAccessToken()
    const results: Array<any> = []

    for (const contract of signedContracts) {
      const project = projectMap[contract.project_id]
      if (!project?.box_folder_id) continue

      console.log(`\n=== ${project.title} ===`)

      // 受注者情報を取得
      const { data: contractor } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', contract.contractor_id)
        .single()

      if (!contractor?.email) continue

      console.log(`受注者: ${contractor.display_name} (${contractor.email})`)

      const foldersProcessed = []

      // メインフォルダのコラボレーションを確認
      const mainResult = await cleanupAndRecreateCollaboration(
        project.box_folder_id,
        contractor.email,
        accessToken,
        project.title
      )

      foldersProcessed.push({
        folder: 'メインフォルダ',
        ...mainResult
      })

      // サブフォルダも処理
      try {
        const items = await getBoxFolderItems(project.box_folder_id)
        const subfolders = items.filter(item => item.type === 'folder')

        for (const subfolder of subfolders) {
          const subResult = await cleanupAndRecreateCollaboration(
            subfolder.id,
            contractor.email,
            accessToken,
            `${project.title} - ${subfolder.name}`
          )

          foldersProcessed.push({
            folder: subfolder.name,
            ...subResult
          })

          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (error) {
        console.error('サブフォルダ処理エラー:', error)
      }

      results.push({
        project: project.title,
        contractor: contractor.email,
        folders: foldersProcessed
      })
    }

    return NextResponse.json({
      message: 'クリーンアップ完了',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('クリーンアップエラー:', error)
    return NextResponse.json(
      {
        message: 'エラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}

async function cleanupAndRecreateCollaboration(
  folderId: string,
  email: string,
  accessToken: string,
  folderName: string
) {
  console.log(`\n📁 処理中: ${folderName}`)

  try {
    // 既存のコラボレーションを取得
    const response = await fetch(
      `https://api.box.com/2.0/folders/${folderId}/collaborations`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    )

    if (!response.ok) {
      return { success: false, error: `コラボレーション取得失敗: ${response.status}` }
    }

    const data = await response.json()
    console.log(`  既存のコラボレーター: ${data.entries?.length || 0}名`)

    // App Userまたは同じメールアドレスのコラボレーションを削除
    let deletedCount = 0
    if (data.entries && data.entries.length > 0) {
      for (const collab of data.entries) {
        const accessibleBy = collab.accessible_by

        // Caddon Integrationアプリによるコラボレーション以外は削除しない
        if (accessibleBy.type === 'user') {
          const shouldDelete =
            // App Userの場合（loginがメールアドレス形式でない、またはis_platform_access_only）
            (!accessibleBy.login?.includes('@')) ||
            // 同じメールアドレスの場合
            (accessibleBy.login?.toLowerCase() === email.toLowerCase())

          if (shouldDelete) {
            console.log(`  🗑️ 削除: ${accessibleBy.name} (${accessibleBy.login || accessibleBy.id})`)

            const deleteResponse = await fetch(
              `https://api.box.com/2.0/collaborations/${collab.id}`,
              {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${accessToken}`
                }
              }
            )

            if (deleteResponse.ok) {
              deletedCount++
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }
        }
      }
    }

    console.log(`  ✅ 削除完了: ${deletedCount}件`)

    // メールアドレスで新しくコラボレーションを追加
    console.log(`  📧 新規追加: ${email}`)

    const addResponse = await fetch('https://api.box.com/2.0/collaborations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item: {
          id: folderId,
          type: 'folder'
        },
        accessible_by: {
          login: email,
          type: 'user'
        },
        role: 'editor'
      })
    })

    if (!addResponse.ok) {
      const errorText = await addResponse.text()
      return {
        success: false,
        deleted: deletedCount,
        error: `コラボレーション追加失敗: ${addResponse.status} - ${errorText}`
      }
    }

    console.log(`  ✅ 追加完了`)

    return {
      success: true,
      deleted: deletedCount,
      added: true
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '不明なエラー'
    }
  }
}
