import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken, addBoxCollaborator } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Adding user access to Box folders...')

    const { userEmail } = await request.json()
    const targetEmail = userEmail || 'ito.dev@ii-stylelab.com' // デフォルトユーザー

    const accessToken = await getAppAuthAccessToken()
    const projectsFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID!

    console.log(`👤 Adding access for user: ${targetEmail}`)
    console.log(`📁 Projects folder ID: ${projectsFolderId}`)

    // 1. Projectsフォルダにユーザーをコラボレーターとして追加
    try {
      console.log(`🔗 Adding collaboration to Projects folder...`)
      const collaborationResult = await addBoxCollaborator(
        projectsFolderId,
        targetEmail,
        'co-owner' // 最高権限を付与
      )

      console.log('✅ Collaboration added to Projects folder:', collaborationResult)
    } catch (error: any) {
      console.log('⚠️ Collaboration already exists or failed:', error.message)
      // 既に存在する場合は継続
    }

    // 2. 各会社フォルダにもアクセス権を追加
    const companyFoldersResponse = await fetch(`https://api.box.com/2.0/folders/${projectsFolderId}/items?limit=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!companyFoldersResponse.ok) {
      throw new Error(`Failed to get company folders: ${companyFoldersResponse.status}`)
    }

    const itemsData = await companyFoldersResponse.json()
    const companyFolders = itemsData.entries.filter((item: any) => item.type === 'folder')

    const collaborationResults = []

    for (const folder of companyFolders) {
      try {
        console.log(`🔗 Adding collaboration to ${folder.name}...`)
        const result = await addBoxCollaborator(
          folder.id,
          targetEmail,
          'editor' // 編集権限
        )

        collaborationResults.push({
          folder_id: folder.id,
          folder_name: folder.name,
          status: 'success',
          collaboration: result
        })
        console.log(`✅ Added collaboration to ${folder.name}`)
      } catch (error: any) {
        console.log(`⚠️ Collaboration failed for ${folder.name}:`, error.message)
        collaborationResults.push({
          folder_id: folder.id,
          folder_name: folder.name,
          status: 'failed',
          error: error.message
        })
      }
    }

    // 3. ユーザーに共有リンクも作成
    try {
      const sharedLinkResponse = await fetch(`https://api.box.com/2.0/folders/${projectsFolderId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shared_link: {
            access: "company",
            permissions: {
              can_download: true,
              can_preview: true,
              can_edit: true
            }
          }
        })
      })

      let sharedLinkUrl = null
      if (sharedLinkResponse.ok) {
        const result = await sharedLinkResponse.json()
        sharedLinkUrl = result.shared_link.url
        console.log(`🔗 Created shared link for Projects folder: ${sharedLinkUrl}`)
      }

      return NextResponse.json({
        message: 'User access setup completed',
        user_email: targetEmail,
        projects_folder: {
          id: projectsFolderId,
          shared_link: sharedLinkUrl,
          direct_url: `https://app.box.com/folder/${projectsFolderId}`
        },
        company_collaborations: collaborationResults,
        next_steps: [
          "1. ユーザーのBoxアカウントでログインしてください",
          "2. 共有されたフォルダが 'すべてのファイル' に表示されます",
          "3. または直接リンクでアクセスしてください",
          `4. Projects folder: https://app.box.com/folder/${projectsFolderId}`
        ]
      })

    } catch (error) {
      console.error('Shared link creation failed:', error)
      return NextResponse.json({
        message: 'User access partially completed',
        user_email: targetEmail,
        projects_folder: {
          id: projectsFolderId,
          direct_url: `https://app.box.com/folder/${projectsFolderId}`
        },
        company_collaborations: collaborationResults,
        warning: 'Shared link creation failed, but collaborations were added'
      })
    }

  } catch (error) {
    console.error('❌ Add user access error:', error)
    return NextResponse.json({
      error: 'Failed to add user access',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}