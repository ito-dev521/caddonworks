import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { createCompanyFolder, createProjectFolderStructure } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Starting Box folder synchronization...')

    // 1. 組織の同期
    console.log('📁 Syncing organization folders...')
    const { data: organizations, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, name, box_folder_id')

    if (orgError) {
      console.error('❌ Failed to fetch organizations:', orgError)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }

    const orgResults = []
    for (const org of organizations || []) {
      try {
        let boxFolderId = org.box_folder_id

        // Box folder IDが未設定の場合は作成
        if (!boxFolderId) {
          console.log(`📁 Creating Box folder for organization: ${org.name}`)
          const folderResult = await createCompanyFolder(org.name)
          boxFolderId = folderResult.id

          // データベースを更新
          await supabaseAdmin
            .from('organizations')
            .update({ box_folder_id: boxFolderId })
            .eq('id', org.id)

          console.log(`✅ Created Box folder for ${org.name}: ${boxFolderId}`)
        } else {
          console.log(`📂 Organization ${org.name} already has Box folder: ${boxFolderId}`)
        }

        orgResults.push({
          organization_id: org.id,
          organization_name: org.name,
          box_folder_id: boxFolderId,
          status: org.box_folder_id ? 'existing' : 'created'
        })

      } catch (error) {
        console.error(`❌ Failed to sync organization ${org.name}:`, error)
        orgResults.push({
          organization_id: org.id,
          organization_name: org.name,
          box_folder_id: null,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 2. プロジェクトの同期
    console.log('📁 Syncing project folders...')
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select(`
        id,
        title,
        box_folder_id,
        organizations!inner(id, name, box_folder_id)
      `)
      .in('status', ['active', 'in_progress', 'completed'])

    if (projectError) {
      console.error('❌ Failed to fetch projects:', projectError)
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 })
    }

    const projectResults = []
    for (const project of projects || []) {
      try {
        let projectBoxFolderId = project.box_folder_id

        // Project box folder IDが未設定の場合は作成
        if (!projectBoxFolderId) {
          const org = Array.isArray(project.organizations) ? project.organizations[0] : project.organizations
          if (!org || !org.box_folder_id) {
            console.warn(`⚠️ Skipping project ${project.title}: Organization has no Box folder`)
            continue
          }

          console.log(`📁 Creating Box folder for project: ${project.title}`)
          const folderResult = await createProjectFolderStructure(
            project.title,
            project.id,
            org.box_folder_id
          )
          projectBoxFolderId = folderResult.folderId

          // データベースを更新
          await supabaseAdmin
            .from('projects')
            .update({ box_folder_id: projectBoxFolderId })
            .eq('id', project.id)

          console.log(`✅ Created Box folder for project ${project.title}: ${projectBoxFolderId}`)

          projectResults.push({
            project_id: project.id,
            project_title: project.title,
            box_folder_id: projectBoxFolderId,
            organization_name: org.name,
            subfolders: folderResult.subfolders,
            status: 'created'
          })
        } else {
          const org = Array.isArray(project.organizations) ? project.organizations[0] : project.organizations
          console.log(`📂 Project ${project.title} already has Box folder: ${projectBoxFolderId}`)
          projectResults.push({
            project_id: project.id,
            project_title: project.title,
            box_folder_id: projectBoxFolderId,
            organization_name: org?.name || 'Unknown',
            status: 'existing'
          })
        }

      } catch (error) {
        console.error(`❌ Failed to sync project ${project.title}:`, error)
        projectResults.push({
          project_id: project.id,
          project_title: project.title,
          box_folder_id: null,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // 3. 結果の集計
    const organizationStats = {
      total: orgResults.length,
      created: orgResults.filter(r => r.status === 'created').length,
      existing: orgResults.filter(r => r.status === 'existing').length,
      failed: orgResults.filter(r => r.status === 'failed').length
    }

    const projectStats = {
      total: projectResults.length,
      created: projectResults.filter(r => r.status === 'created').length,
      existing: projectResults.filter(r => r.status === 'existing').length,
      failed: projectResults.filter(r => r.status === 'failed').length
    }

    console.log('✅ Box folder synchronization completed')
    console.log(`📊 Organizations: ${organizationStats.created} created, ${organizationStats.existing} existing, ${organizationStats.failed} failed`)
    console.log(`📊 Projects: ${projectStats.created} created, ${projectStats.existing} existing, ${projectStats.failed} failed`)

    return NextResponse.json({
      message: 'Box folder synchronization completed',
      organizations: {
        stats: organizationStats,
        results: orgResults
      },
      projects: {
        stats: projectStats,
        results: projectResults
      }
    })

  } catch (error) {
    console.error('❌ Box synchronization error:', error)
    return NextResponse.json({
      error: 'Box synchronization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}