/**
 * Box Collaboration API - フォルダ権限とユーザー管理
 * Box Drive連動のための高度な権限制御機能
 */

import { getAppAuthAccessToken } from './box'

// Box権限レベル定義
export type BoxRole =
  | 'viewer'           // プレビューのみ、ダウンロード不可
  | 'previewer'        // プレビューのみ、ダウンロード不可
  | 'uploader'         // アップロード可能、プレビュー可能、ダウンロード不可
  | 'previewer_uploader' // プレビュー・アップロード可能、ダウンロード不可
  | 'viewer_uploader'  // プレビュー・アップロード・ダウンロード可能
  | 'co-owner'         // 全権限
  | 'editor'           // 編集権限あり、ダウンロード可能

// 権限マッピング：アプリの権限設定からBox権限への変換
export function mapAppPermissionsToBoxRole(permissions: {
  preview: boolean
  download: boolean
  upload: boolean
  edit: boolean
}): BoxRole {
  const { preview, download, upload, edit } = permissions

  // 編集権限がある場合
  if (edit && download && upload) {
    return 'editor'
  }

  // ダウンロード権限がある場合
  if (download && upload) {
    return 'viewer_uploader'
  }

  // アップロード権限のみの場合
  if (upload && !download) {
    return 'previewer_uploader'
  }

  // プレビューのみの場合
  if (preview && !download && !upload) {
    return 'previewer'
  }

  // デフォルト：プレビューのみ
  return 'previewer'
}

/**
 * フォルダにユーザーを協力者として追加（メールアドレスベース）
 * メールアドレスで直接コラボレーション招待を送信
 * - 既存のBoxアカウントを持つユーザーは即座にアクセス可能
 * - アカウントを持っていないユーザーには招待メールが送信される
 */
export async function addFolderCollaboration(
  folderId: string,
  email: string,
  role: BoxRole,
  folderName?: string
): Promise<{
  success: boolean
  collaborationId?: string
  error?: string
}> {
  try {
    console.log(`🤝 フォルダ協力者を追加中: ${folderName} (${folderId}) - Email: ${email} - Role: ${role}`)

    const accessToken = await getAppAuthAccessToken()

    // 既存の協力者をチェック
    const existingCollabResponse = await fetch(`https://api.box.com/2.0/folders/${folderId}/collaborations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (existingCollabResponse.ok) {
      const existingCollabs = await existingCollabResponse.json()
      const existingCollab = existingCollabs.entries?.find((collab: any) =>
        collab.accessible_by?.login?.toLowerCase() === email.toLowerCase()
      )

      if (existingCollab) {
        // 既存の協力者の権限を更新
        console.log('📝 既存協力者の権限を更新中...')
        const updateResponse = await fetch(`https://api.box.com/2.0/collaborations/${existingCollab.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role })
        })

        if (updateResponse.ok) {
          const updatedCollab = await updateResponse.json()
          console.log(`✅ 協力者権限を更新しました: ${role}`)
          return {
            success: true,
            collaborationId: updatedCollab.id
          }
        }
      }
    }

    // 新しい協力者を追加（メールアドレスで直接招待）
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
        role: role
      })
    })

    if (!addResponse.ok) {
      const errorText = await addResponse.text()
      let errorMessage = `HTTP ${addResponse.status}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error_description || errorText
      } catch {
        errorMessage = errorText
      }
      throw new Error(`Collaboration creation failed: ${addResponse.status} - ${errorMessage}`)
    }

    const newCollab = await addResponse.json()
    console.log(`✅ 新しい協力者を追加しました: ${role}`)

    return {
      success: true,
      collaborationId: newCollab.id
    }

  } catch (error: any) {
    console.error('❌ フォルダ協力者追加エラー:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * ユーザーの全フォルダ権限を同期（メールアドレスベース）
 */
export async function syncUserBoxPermissions(
  userId: string,
  email: string,
  permissions: Array<{
    folderId: string
    folderName: string
    preview: boolean
    download: boolean
    upload: boolean
    edit: boolean
  }>
): Promise<{
  success: boolean
  syncedPermissions: number
  errors: string[]
}> {
  console.log(`🔄 ユーザーのBox権限同期開始: ${userId} (${email})`)

  const errors: string[] = []
  let syncedPermissions = 0

  for (const permission of permissions) {
    try {
      const boxRole = mapAppPermissionsToBoxRole(permission)
      const result = await addFolderCollaboration(
        permission.folderId,
        email,
        boxRole,
        permission.folderName
      )

      if (result.success) {
        syncedPermissions++
        console.log(`✅ ${permission.folderName}: ${boxRole}`)
      } else {
        errors.push(`${permission.folderName}: ${result.error}`)
        console.error(`❌ ${permission.folderName}: ${result.error}`)
      }

      // API レート制限を回避するため少し待機
      await new Promise(resolve => setTimeout(resolve, 200))

    } catch (error: any) {
      errors.push(`${permission.folderName}: ${error.message}`)
      console.error(`❌ ${permission.folderName}:`, error)
    }
  }

  console.log(`🎉 Box権限同期完了: ${syncedPermissions}/${permissions.length}`)

  return {
    success: errors.length === 0,
    syncedPermissions,
    errors
  }
}

/**
 * フォルダから協力者を削除（メールアドレスベース）
 */
export async function removeFolderCollaboration(
  folderId: string,
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const accessToken = await getAppAuthAccessToken()

    // 既存の協力者を検索
    const response = await fetch(`https://api.box.com/2.0/folders/${folderId}/collaborations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch collaborations: ${response.status}`)
    }

    const data = await response.json()
    const collaboration = data.entries?.find((collab: any) =>
      collab.accessible_by?.login?.toLowerCase() === email.toLowerCase()
    )

    if (!collaboration) {
      return { success: true } // 既に協力者ではない
    }

    // 協力者を削除
    const deleteResponse = await fetch(`https://api.box.com/2.0/collaborations/${collaboration.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!deleteResponse.ok) {
      throw new Error(`Failed to delete collaboration: ${deleteResponse.status}`)
    }

    console.log('✅ フォルダ協力者を削除しました')
    return { success: true }

  } catch (error: any) {
    console.error('❌ 協力者削除エラー:', error)
    return { success: false, error: error.message }
  }
}