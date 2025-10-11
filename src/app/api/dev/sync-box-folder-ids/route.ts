import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * 開発環境専用：BOXのフォルダIDをデータベースに同期
 * プロジェクトコード（project_code）とBOXフォルダ名をマッチングして更新
 */
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      { message: 'このAPIは開発環境でのみ使用可能です' },
      { status: 403 }
    )
  }

  console.log('🔄 BOXフォルダIDの同期を開始します...\n')

  try {
    // データベースから全プロジェクトを取得
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title')

    if (projectsError || !projects) {
      return NextResponse.json({
        message: 'プロジェクトの取得に失敗しました',
        error: projectsError?.message
      }, { status: 500 })
    }

    console.log(`📋 ${projects.length}件のプロジェクトを取得しました`)

    // プロジェクトIDの最初の8文字をプロジェクトコードとして使用
    const projectsWithCode = projects.map(p => ({
      ...p,
      projectCode: p.id.substring(0, 8)
    }))

    // BOXから全プロジェクトフォルダを取得
    const orgFolderIds = [
      { id: '342433760835', name: 'イースタイルラボ株式会社' },
      { id: '344511284799', name: 'テスト株式会社' }
    ]

    const boxProjects = []

    for (const orgFolder of orgFolderIds) {
      console.log(`\n📁 ${orgFolder.name} のフォルダを取得中...`)
      const items = await getBoxFolderItems(orgFolder.id)
      const projectFolders = items.filter(item => item.type === 'folder')

      for (const folder of projectFolders) {
        // フォルダ名から[PRJ-xxxxx]を抽出
        const match = folder.name.match(/\[PRJ-([a-f0-9]+)\]/)
        if (match) {
          boxProjects.push({
            projectCode: match[1],
            folderId: folder.id,
            folderName: folder.name,
            orgName: orgFolder.name
          })
        }
      }
    }

    console.log(`\n📦 BOXから${boxProjects.length}件のプロジェクトフォルダを取得しました`)

    // マッチングして更新
    const results = []
    let updatedCount = 0
    let notFoundCount = 0

    for (const boxProject of boxProjects) {
      const dbProject = projectsWithCode.find(p =>
        p.projectCode === boxProject.projectCode
      )

      if (dbProject) {
        console.log(`\n✅ マッチ: ${boxProject.folderName}`)
        console.log(`   DB: ${dbProject.title}`)
        console.log(`   フォルダID: ${boxProject.folderId}`)

        // box_folder_idを更新
        const { error: updateError } = await supabaseAdmin
          .from('projects')
          .update({ box_folder_id: boxProject.folderId })
          .eq('id', dbProject.id)

        if (updateError) {
          console.log(`   ❌ 更新失敗: ${updateError.message}`)
          results.push({
            projectCode: boxProject.projectCode,
            projectTitle: dbProject.title,
            success: false,
            error: updateError.message
          })
        } else {
          console.log(`   ✅ 更新成功`)
          updatedCount++
          results.push({
            projectCode: boxProject.projectCode,
            projectTitle: dbProject.title,
            boxFolderId: boxProject.folderId,
            success: true
          })
        }
      } else {
        console.log(`\n⚠️ DBに見つかりません: ${boxProject.folderName}`)
        notFoundCount++
        results.push({
          projectCode: boxProject.projectCode,
          folderName: boxProject.folderName,
          boxFolderId: boxProject.folderId,
          success: false,
          error: 'データベースに対応するプロジェクトが見つかりません'
        })
      }
    }

    console.log(`\n${'='.repeat(60)}`)
    console.log('📊 同期結果')
    console.log('='.repeat(60))
    console.log(`✅ 更新: ${updatedCount}件`)
    console.log(`⚠️ 未検出: ${notFoundCount}件`)

    return NextResponse.json({
      message: `同期完了: ${updatedCount}件更新、${notFoundCount}件未検出`,
      updated: updatedCount,
      notFound: notFoundCount,
      results
    })

  } catch (error) {
    console.error('同期エラー:', error)
    return NextResponse.json(
      {
        message: 'エラーが発生しました',
        error: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
}
