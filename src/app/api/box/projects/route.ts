export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBoxFolderItems, createCompanyFolder, createProjectFolderStructure } from '@/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)


export async function GET(request: NextRequest) {
  try {

    let orgAdminMembership: any = null
    let authenticatedUser = false

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
    } else {
      const token = authHeader.replace('Bearer ', '')

      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !user) {
        console.error('Auth error:', authError)
      } else {
        authenticatedUser = true

        // ユーザープロフィールを取得
        const { data: userProfile, error: userError } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('auth_user_id', user.id)
          .single()

        if (userError || !userProfile) {
        } else {
          // 組織情報を取得（発注者権限チェック）
          const { data: memberships, error: membershipError } = await supabaseAdmin
            .from('memberships')
            .select('org_id, role')
            .eq('user_id', userProfile.id)

          if (membershipError || !memberships) {
          } else {
            orgAdminMembership = memberships.find(m => m.role === 'OrgAdmin')
            if (!orgAdminMembership) {
            }
          }
        }
      }
    }

    // If no proper authentication, return demo data but try to fetch real BOX data for testing
    if (!orgAdminMembership) {

      // Try to fetch real BOX data for the ケセラセラ folder to test BOX API
      try {
        const hasBoxConfig = process.env.BOX_CLIENT_ID &&
                             process.env.BOX_CLIENT_SECRET &&
                             process.env.BOX_ENTERPRISE_ID

        if (hasBoxConfig) {
          const rootFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '342069286897'
          const realBoxItems = await getBoxFolderItems(rootFolderId)
          

          // Look for デモコンサルタント株式会社 folder
          let demoConsultantFolder = realBoxItems.find(item => item.name.includes('デモコンサルタント'))
          let tesut2ProjectData: any = null

          if (demoConsultantFolder) {
            try {
              const orgItems = await getBoxFolderItems(demoConsultantFolder.id)

              // Look for tesut2 project
              const tesut2Project = orgItems.find(item => item.name.includes('tesut2') || item.name.includes('039feb26'))
              if (tesut2Project) {

                // Get tesut2 project contents
                const tesut2Items = await getBoxFolderItems(tesut2Project.id)

                // Get contents of 01_受取データ subfolder
                const ukeToriFolder = tesut2Items.find(item => item.name.includes('受取') || item.name.includes('01_'))
                let ukeToriFiles: any[] = []
                if (ukeToriFolder) {
                  ukeToriFiles = await getBoxFolderItems(ukeToriFolder.id)
                }

                tesut2ProjectData = {
                  id: 'real-tesut2',
                  title: 'tesut2（デモコンサルタント株式会社）',
                  box_folder_id: tesut2Project.id,
                  status: 'completed',
                  created_at: tesut2Project.created_at,
                  box_items: tesut2Items,
                  subfolders: {
                    '受取': ukeToriFolder?.id || 'not_found',
                    '作業': tesut2Items.find(item => item.name.includes('作業') || item.name.includes('02_'))?.id || 'not_found',
                    '納品': tesut2Items.find(item => item.name.includes('納品') || item.name.includes('03_'))?.id || 'not_found',
                    '契約': tesut2Items.find(item => item.name.includes('契約') || item.name.includes('04_'))?.id || 'not_found'
                  },
                  recent_files: ukeToriFiles.slice(0, 5)
                }
              }
            } catch (error) {
              
            }
          } else {
            
          }

          const projects = []

          // Add tesut2 project if found
          if (tesut2ProjectData) {
            projects.push(tesut2ProjectData)
          }

          // Add other demo projects
          projects.push({
            id: 'demo-real-box',
            title: `リアルBOXテスト（プロジェクトルート）`,
            box_folder_id: rootFolderId,
            status: 'in_progress',
            created_at: new Date().toISOString(),
            box_items: realBoxItems.slice(0, 5), // First 5 items
            subfolders: {
              '受取': realBoxItems.find(item => item.type === 'folder' && item.name.includes('受取'))?.id || 'not_found',
              '作業': realBoxItems.find(item => item.type === 'folder' && item.name.includes('作業'))?.id || 'not_found',
              '納品': realBoxItems.find(item => item.type === 'folder' && item.name.includes('納品'))?.id || 'not_found',
              '契約': realBoxItems.find(item => item.type === 'folder' && item.name.includes('契約'))?.id || 'not_found'
            },
            recent_files: realBoxItems.filter(item => item.type === 'file').slice(0, 3)
          })

          return NextResponse.json({
            projects: projects
          }, { status: 200 })
        } else {
        }
      } catch (error) {
        console.error('❌ Real BOX test failed:', error)
      }

      // Fallback to demo data
      return NextResponse.json({
        projects: [
          {
            id: 'demo-fallback',
            title: 'デモプロジェクト（認証失敗）',
            box_folder_id: 'demo_folder_123',
            status: 'in_progress',
            created_at: new Date().toISOString(),
            box_items: [
              {
                id: 'demo_file_1',
                name: 'フォールバックファイル.pdf',
                type: 'file',
                size: 1024,
                modified_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
                path_collection: { entries: [{ name: 'デモプロジェクト' }] }
              }
            ],
            subfolders: {
              '受取': 'demo_subfolder_1',
              '作業': 'demo_subfolder_2',
              '納品': 'demo_subfolder_3',
              '契約': 'demo_subfolder_4'
            },
            recent_files: []
          }
        ]
      }, { status: 200 })
    }

    // 組織のすべての案件を取得（BOX連携の有無に関わらず）
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id, status, created_at')
      .eq('org_id', orgAdminMembership.org_id)
      .order('created_at', { ascending: false })

    

    if (projectsError) {
      return NextResponse.json({ message: 'プロジェクト取得エラー', error: projectsError.message }, { status: 500 })
    }

    // 各プロジェクトのBoxフォルダ情報を取得
    const projectsWithBoxData = await Promise.all(
      (projects || []).map(async (project) => {
        try {
          // Box API 設定をチェック
          const hasBoxConfig = process.env.BOX_CLIENT_ID &&
                               process.env.BOX_CLIENT_SECRET &&
                               process.env.BOX_ENTERPRISE_ID

          

          if (!hasBoxConfig) {
            return {
              ...project,
              box_items: [
                {
                  id: 'mock_folder',
                  name: 'テストフォルダ',
                  type: 'folder',
                  size: undefined,
                  modified_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  path_collection: { entries: [{ name: project.title }] }
                }
              ],
              subfolders: {
                '受取': 'mock_folder_1',
                '作業': 'mock_folder_2',
                '納品': 'mock_folder_3',
                '契約': 'mock_folder_4'
              }
            }
          }

          // BOXフォルダIDをチェック
          if (!project.box_folder_id) {
            // Boxフォルダが存在しない場合、自動作成を試行
            try {
              // まず組織情報を取得
              const { data: organization, error: orgError } = await supabaseAdmin
                .from('organizations')
                .select('name')
                .eq('id', orgAdminMembership.org_id)
                .single()

              if (orgError || !organization) {
                throw new Error('組織情報を取得できません')
              }

              // 会社フォルダを取得または作成
              const companyFolder = await createCompanyFolder(organization.name)

              // プロジェクトフォルダ構造を作成
              const folderStructure = await createProjectFolderStructure(
                project.title,
                project.id,
                companyFolder.id
              )

              // データベースにBoxフォルダIDを保存
              const { error: updateError } = await supabaseAdmin
                .from('projects')
                .update({ box_folder_id: folderStructure.folderId })
                .eq('id', project.id)

              if (updateError) {
                console.error('Failed to update project with Box folder ID:', updateError)
              }

              // 作成したフォルダの内容を取得
              const items = await getBoxFolderItems(folderStructure.folderId)

              return {
                ...project,
                box_folder_id: folderStructure.folderId,
                box_items: items,
                subfolders: folderStructure.subfolders,
                recent_files: items.filter(item => item.type === 'file').slice(0, 5)
              }

            } catch (createError) {
              console.error('Failed to create Box folder structure:', createError)
              return {
                ...project,
                box_items: [],
                subfolders: {},
                error: `Boxフォルダの作成に失敗しました: ${(createError as Error).message || 'Unknown error'}`
              }
            }
          }

          const items = await getBoxFolderItems(project.box_folder_id)
          

          // 実際のサブフォルダIDを取得
          const subfolders: Record<string, string> = {}

          // BOXフォルダ内のアイテムからサブフォルダを特定
          const folderMapping: Record<string, string[]> = {
            '受取': ['01_受取データ', '受取', '01_受取', '01_'],
            '作業': ['02_作業フォルダ', '作業', '02_作業', '02_'],
            '納品': ['03_納品データ', '納品', '03_納品', '03_'],
            '契約': ['04_契約資料', '契約', '04_契約', '04_']
          }

          items.forEach(item => {
            if (item.type === 'folder') {
              const itemName = item.name

              // 各カテゴリに対してマッチングを確認
              Object.entries(folderMapping).forEach(([category, patterns]) => {
                patterns.forEach(pattern => {
                  if (itemName.includes(pattern) && !subfolders[category]) {
                    subfolders[category] = item.id
                    console.log(`📁 Found existing subfolder: ${category} -> ${itemName} (ID: ${item.id})`)
                  }
                })
              })
            }
          })

          // サブフォルダが見つからない場合のログ
          const expectedCategories = ['受取', '作業', '納品', '契約']
          expectedCategories.forEach(category => {
            if (!subfolders[category]) {
              console.warn(`📁 Subfolder not found for category: ${category} in project ${project.id}`)
            }
          })

          // サブフォルダ内のファイルも取得して最近のファイルに含める
          const allRecentFiles: any[] = [...items.filter(item => item.type === 'file')]

          // 各サブフォルダからファイルを取得
          for (const [folderName, folderId] of Object.entries(subfolders)) {
            try {
              // 実際のBOXフォルダからファイルを取得
              if (true) {
                try {
                  const subFolderItems = await getBoxFolderItems(folderId)
                  const subFiles = subFolderItems
                    .filter(item => item.type === 'file')
                    .map(item => ({ ...item, subfolder: folderName })) // どのサブフォルダかを記録
                  allRecentFiles.push(...subFiles)
                } catch (subError) {
                  console.error(`Error accessing subfolder ${folderName} (${folderId}):`, subError)
                }
              } else {
                
              }
            } catch (error) {
              
            }
          }

          // 最新5件の時間順でソート
          const recentFiles = allRecentFiles
            .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
            .slice(0, 10) // 少し多めに取得

          

          return {
            ...project,
            box_items: items,
            subfolders: subfolders,
            recent_files: recentFiles // 新しく追加
          }
        } catch (error) {
          console.error(`Box folder error for project ${project.id}:`, error)
          return {
            ...project,
            box_items: [],
            subfolders: {},
            error: 'Boxフォルダにアクセスできません'
          }
        }
      })
    )

    return NextResponse.json({
      projects: projectsWithBoxData
    }, { status: 200 })

  } catch (e: any) {
    return NextResponse.json({
      message: 'サーバーエラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}