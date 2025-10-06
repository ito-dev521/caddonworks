export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getBoxFolderItems, renameBoxFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { rootFolderId, dryRun = true } = await request.json()

    if (!rootFolderId) {
      return NextResponse.json({
        message: 'rootFolderId is required'
      }, { status: 400 })
    }

    console.log('Starting folder rename operation...')
    console.log('Root folder ID:', rootFolderId)
    console.log('Dry run mode:', dryRun)

    // プロジェクトルートフォルダの内容を取得
    const companies = await getBoxFolderItems(rootFolderId)

    const results = []

    for (const company of companies) {
      if (company.type !== 'folder') continue

      console.log(`\n=== Processing company: ${company.name} (${company.id}) ===`)

      try {
        // 会社フォルダ内のプロジェクトを取得
        const projects = await getBoxFolderItems(company.id)

        for (const project of projects) {
          if (project.type !== 'folder') continue

          console.log(`  Processing project: ${project.name} (${project.id})`)

          try {
            // プロジェクト内のサブフォルダを取得
            const subfolders = await getBoxFolderItems(project.id)

            const subfolderResults = []

            for (const subfolder of subfolders) {
              if (subfolder.type !== 'folder') continue

              const currentName = subfolder.name
              let newName = ''

              // 既に番号が付いている場合はスキップ
              if (currentName.match(/^\d{2}_/)) {
                console.log(`    Skipping (already numbered): ${currentName}`)
                subfolderResults.push({
                  folderId: subfolder.id,
                  oldName: currentName,
                  newName: currentName,
                  status: 'skipped',
                  reason: 'already numbered'
                })
                continue
              }

              // フォルダ名マッピング
              if (currentName.includes('受取') || currentName.includes('受領')) {
                newName = '01_受取データ'
              } else if (currentName.includes('作業') || currentName.includes('ワーク')) {
                newName = '02_作業データ'
              } else if (currentName.includes('納品') || currentName.includes('成果物')) {
                newName = '03_納品データ'
              } else if (currentName.includes('契約') || currentName.includes('合意')) {
                newName = '04_契約データ'
              } else {
                console.log(`    Unknown folder type: ${currentName}`)
                subfolderResults.push({
                  folderId: subfolder.id,
                  oldName: currentName,
                  newName: '',
                  status: 'skipped',
                  reason: 'unknown folder type'
                })
                continue
              }

              console.log(`    ${currentName} -> ${newName}`)

              if (!dryRun) {
                try {
                  await renameBoxFolder(subfolder.id, newName)
                  subfolderResults.push({
                    folderId: subfolder.id,
                    oldName: currentName,
                    newName: newName,
                    status: 'success'
                  })
                } catch (renameError) {
                  console.error(`    Rename failed: ${renameError}`)
                  subfolderResults.push({
                    folderId: subfolder.id,
                    oldName: currentName,
                    newName: newName,
                    status: 'error',
                    error: (renameError as Error).message
                  })
                }
              } else {
                subfolderResults.push({
                  folderId: subfolder.id,
                  oldName: currentName,
                  newName: newName,
                  status: 'dry_run'
                })
              }
            }

            results.push({
              companyName: company.name,
              companyId: company.id,
              projectName: project.name,
              projectId: project.id,
              subfolders: subfolderResults
            })

          } catch (projectError) {
            console.error(`  Error processing project ${project.name}:`, projectError)
            results.push({
              companyName: company.name,
              companyId: company.id,
              projectName: project.name,
              projectId: project.id,
              error: (projectError as Error).message
            })
          }
        }

      } catch (companyError) {
        console.error(`Error processing company ${company.name}:`, companyError)
        results.push({
          companyName: company.name,
          companyId: company.id,
          error: (companyError as Error).message
        })
      }
    }

    const summary = {
      totalCompanies: companies.filter(c => c.type === 'folder').length,
      totalProjects: results.reduce((sum, r) => sum + (r.subfolders ? 1 : 0), 0),
      totalSubfolders: results.reduce((sum, r) => sum + (r.subfolders?.length || 0), 0),
      successfulRenames: results.reduce((sum, r) =>
        sum + (r.subfolders?.filter(s => s.status === 'success').length || 0), 0),
      skipped: results.reduce((sum, r) =>
        sum + (r.subfolders?.filter(s => s.status === 'skipped').length || 0), 0),
      errors: results.reduce((sum, r) =>
        sum + (r.subfolders?.filter(s => s.status === 'error').length || 0), 0)
    }

    return NextResponse.json({
      success: true,
      dryRun: dryRun,
      summary: summary,
      results: results
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Bulk folder rename failed:', error)
    return NextResponse.json({
      success: false,
      message: 'Bulk folder rename failed',
      error: error.message
    }, { status: 500 })
  }
}