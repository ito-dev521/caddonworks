import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Making Box folders accessible to users...')

    const accessToken = await getAppAuthAccessToken()

    // 1. Projectsフォルダを取得
    const projectsFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID!
    console.log(`📁 Projects folder ID: ${projectsFolderId}`)

    // 2. Projectsフォルダの情報を取得
    const projectsFolderResponse = await fetch(`https://api.box.com/2.0/folders/${projectsFolderId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!projectsFolderResponse.ok) {
      const errorText = await projectsFolderResponse.text()
      throw new Error(`Projects folder access failed: ${projectsFolderResponse.status} - ${errorText}`)
    }

    const projectsFolder = await projectsFolderResponse.json()
    console.log(`📁 Projects folder: ${projectsFolder.name}`)

    // 3. Projectsフォルダの内容を取得
    const itemsResponse = await fetch(`https://api.box.com/2.0/folders/${projectsFolderId}/items?limit=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!itemsResponse.ok) {
      const errorText = await itemsResponse.text()
      throw new Error(`Failed to get folder items: ${itemsResponse.status} - ${errorText}`)
    }

    const itemsData = await itemsResponse.json()
    const folders = itemsData.entries.filter((item: any) => item.type === 'folder')

    console.log(`📁 Found ${folders.length} company folders`)

    // 4. 各フォルダの詳細情報を取得
    const folderDetails = []
    for (const folder of folders) {
      try {
        const folderResponse = await fetch(`https://api.box.com/2.0/folders/${folder.id}?fields=id,name,owned_by,created_by,shared_link`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (folderResponse.ok) {
          const folderInfo = await folderResponse.json()
          folderDetails.push({
            id: folderInfo.id,
            name: folderInfo.name,
            owned_by: folderInfo.owned_by,
            created_by: folderInfo.created_by,
            shared_link: folderInfo.shared_link,
            path: `https://app.box.com/folder/${folderInfo.id}`
          })
          console.log(`📂 ${folderInfo.name}: ${folderInfo.id}`)
        }
      } catch (error) {
        console.error(`Error getting folder ${folder.id} details:`, error)
      }
    }

    // 5. 共有リンクを有効にする（既に有効でない場合）
    const sharedLinkResults = []
    for (const folder of folderDetails) {
      try {
        if (!folder.shared_link) {
          console.log(`🔗 Creating shared link for: ${folder.name}`)

          const sharedLinkResponse = await fetch(`https://api.box.com/2.0/folders/${folder.id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              shared_link: {
                access: "company", // 会社内アクセス
                permissions: {
                  can_download: true,
                  can_preview: true,
                  can_edit: false
                }
              }
            })
          })

          if (sharedLinkResponse.ok) {
            const result = await sharedLinkResponse.json()
            sharedLinkResults.push({
              folder_id: folder.id,
              folder_name: folder.name,
              shared_link: result.shared_link.url,
              status: 'created'
            })
            console.log(`✅ Shared link created for ${folder.name}: ${result.shared_link.url}`)
          } else {
            const errorText = await sharedLinkResponse.text()
            console.warn(`⚠️ Failed to create shared link for ${folder.name}: ${errorText}`)
            sharedLinkResults.push({
              folder_id: folder.id,
              folder_name: folder.name,
              shared_link: null,
              status: 'failed',
              error: errorText
            })
          }
        } else {
          sharedLinkResults.push({
            folder_id: folder.id,
            folder_name: folder.name,
            shared_link: folder.shared_link.url,
            status: 'existing'
          })
          console.log(`📎 Existing shared link for ${folder.name}: ${folder.shared_link.url}`)
        }
      } catch (error) {
        console.error(`Error creating shared link for ${folder.name}:`, error)
        sharedLinkResults.push({
          folder_id: folder.id,
          folder_name: folder.name,
          shared_link: null,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      message: 'Box folder accessibility setup completed',
      projects_folder: {
        id: projectsFolder.id,
        name: projectsFolder.name,
        url: `https://app.box.com/folder/${projectsFolder.id}`
      },
      company_folders: folderDetails,
      shared_links: sharedLinkResults,
      access_instructions: {
        step1: `Browse to: https://app.box.com/folder/${projectsFolderId}`,
        step2: "You should see the Projects folder and all company subfolders",
        step3: "Each company folder should now be accessible via shared links"
      }
    })

  } catch (error) {
    console.error('❌ Make folders accessible error:', error)
    return NextResponse.json({
      error: 'Failed to make folders accessible',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}