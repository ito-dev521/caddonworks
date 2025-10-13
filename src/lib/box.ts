import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Environment variable ${name} is not set`)
  return v
}

function validateFileSize(size: number, maxSizeMB: number = 15360): void {
  const maxSizeBytes = maxSizeMB * 1024 * 1024
  if (size > maxSizeBytes) {
    throw new Error(`ファイルサイズが大きすぎます（最大${maxSizeMB}MB）`)
  }
}

function validateFileName(fileName: string): void {
  // 不正な文字をチェック
  const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
  if (invalidChars.test(fileName)) {
    throw new Error('ファイル名に無効な文字が含まれています')
  }

  // ファイル名の長さチェック
  if (fileName.length > 255) {
    throw new Error('ファイル名が長すぎます（最大255文字）')
  }

  // 空のファイル名チェック
  if (!fileName.trim()) {
    throw new Error('ファイル名が指定されていません')
  }
}

function sanitizeFileName(fileName: string): string {
  // 危険な文字を安全な文字に置換
  return fileName
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .substring(0, 255)
    .trim()
}

let tokenCache: { token: string; expiresAt: number } | null = null

function isTokenValid(): boolean {
  return tokenCache !== null && Date.now() < tokenCache.expiresAt
}

export async function getAppAuthAccessToken(): Promise<string> {
  // キャッシュされたトークンが有効な場合は再利用
  if (isTokenValid() && tokenCache) {
    return tokenCache.token
  }

  try {
    const clientID = getEnv('BOX_CLIENT_ID')
    const clientSecret = getEnv('BOX_CLIENT_SECRET')
    const enterpriseId = getEnv('BOX_ENTERPRISE_ID')
    let privateKey = getEnv('BOX_JWT_PRIVATE_KEY')
    // 先頭と末尾のシングルクォートを除去
    privateKey = privateKey.replace(/^'|'$/g, '')
    // エスケープされた改行を実際の改行に変換
    privateKey = privateKey.replace(/\\n/g, '\n')
    const passphrase = getEnv('BOX_JWT_PRIVATE_KEY_PASSPHRASE')
    const publicKeyId = getEnv('BOX_PUBLIC_KEY_ID')

    const now = Math.floor(Date.now() / 1000)
    const jti = crypto.randomBytes(16).toString('hex') // 32 chars hex

    const claims = {
      iss: clientID,
      sub: enterpriseId,
      box_sub_type: 'enterprise',
      aud: 'https://api.box.com/oauth2/token',
      iat: now,
      exp: now + 30,
      jti
    }

    const signOptions: SignOptions = {
      algorithm: 'RS256',
      header: { alg: 'RS256', kid: publicKeyId }
    }

    const assertion = jwt.sign(claims, { key: privateKey, passphrase } as any, signOptions)

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      client_id: clientID,
      client_secret: clientSecret,
      assertion
    })

    const res = await fetch('https://api.box.com/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      signal: AbortSignal.timeout(10000) // 10秒でタイムアウト
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('BOX token error:', errorText)
      throw new Error(`BOX認証に失敗しました: ${res.status}`)
    }

    const json: any = await res.json()
    const accessToken = json.access_token as string

    // トークンをキャッシュ（有効期限の90%まで）
    const expiresIn = json.expires_in || 3600
    tokenCache = {
      token: accessToken,
      expiresAt: Date.now() + (expiresIn * 900) // 90%
    }

    return accessToken
  } catch (error: any) {
    console.error('BOX authentication error:', error)
    throw new Error(`BOX認証エラー: ${error.message}`)
  }
}

export async function getBoxFolderItems(folderId: string): Promise<any[]> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch(`https://api.box.com/2.0/folders/${folderId}/items?fields=id,name,type,size,modified_at,created_at,path_collection`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Box folder items error ${res.status}: ${errorText}`)
  }
  const data: any = await res.json()
  return data.entries || []
}

export async function downloadBoxFile(fileId: string): Promise<Response> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Box file download error ${res.status}: ${errorText}`)
  }
  return res
}

// 既存ファイルIDを使用して直接新しいバージョンをアップロード
async function uploadNewVersionDirectly(
  fileData: ArrayBuffer,
  existingFileId: string
): Promise<string> {
  try {
    console.log(`🚀 新バージョンアップロード開始 - ファイルID: ${existingFileId}`)

    const accessToken = await getAppAuthAccessToken()

    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(fileData)]))

    console.log(`📤 Box APIリクエスト: https://upload.box.com/api/2.0/files/${existingFileId}/content`)

    const uploadRes = await fetch(`https://upload.box.com/api/2.0/files/${existingFileId}/content`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData,
      signal: AbortSignal.timeout(300000)
    })

    console.log(`📥 Box APIレスポンス: ${uploadRes.status} ${uploadRes.statusText}`)

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      console.error(`❌ Box API エラー詳細: ${errorText}`)
      throw new Error(`新しいバージョンのアップロードに失敗: ${uploadRes.status} - ${errorText}`)
    }

    const result = await uploadRes.json()
    const fileId = result.entries?.[0]?.id || result.id
    console.log('✅ 新しいバージョンのアップロード成功:', fileId)
    return fileId
  } catch (error) {
    console.error('❌ uploadNewVersionDirectly エラー:', error)
    throw error
  }
}

// 同名ファイルが存在する場合に新しいバージョンをアップロード
async function uploadNewVersionToBox(
  fileData: ArrayBuffer,
  fileName: string,
  folderId: string
): Promise<string> {
  const accessToken = await getAppAuthAccessToken()

  // まず既存ファイルを検索
  const searchRes = await fetch(`https://api.box.com/2.0/folders/${folderId}/items?limit=1000`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!searchRes.ok) {
    throw new Error('既存ファイルの検索に失敗しました')
  }

  const searchData = await searchRes.json()
  const existingFile = searchData.entries.find((item: any) =>
    item.type === 'file' && item.name === fileName
  )

  if (!existingFile) {
    throw new Error('既存ファイルが見つかりません')
  }

  // 新しいバージョンをアップロード
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(fileData)]), fileName)

  const uploadRes = await fetch(`https://upload.box.com/api/2.0/files/${existingFile.id}/content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: formData,
    signal: AbortSignal.timeout(300000)
  })

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text()
    throw new Error(`新しいバージョンのアップロードに失敗: ${uploadRes.status} - ${errorText}`)
  }

  const result = await uploadRes.json()
  return result.entries?.[0]?.id || result.id
}

export async function uploadFileToBox(
  fileDataOrBuffer: ArrayBuffer | Buffer,
  fileName: string,
  folderId: string
): Promise<string> {
  try {
    // ArrayBuffer または Buffer を ArrayBuffer に統一
    const fileData = fileDataOrBuffer instanceof ArrayBuffer
      ? fileDataOrBuffer
      : fileDataOrBuffer.buffer.slice(fileDataOrBuffer.byteOffset, fileDataOrBuffer.byteOffset + fileDataOrBuffer.byteLength)

    // ファイル名とサイズの検証
    validateFileName(fileName)
    validateFileSize(fileData.byteLength)

    // ファイル名をサニタイズ
    const sanitizedFileName = sanitizeFileName(fileName)

    const accessToken = await getAppAuthAccessToken()

    const formData = new FormData()
    formData.append('attributes', JSON.stringify({
      name: sanitizedFileName,
      parent: { id: folderId }
    }))
    formData.append('file', new Blob([fileData]), sanitizedFileName)

    const res = await fetch('https://upload.box.com/api/2.0/files/content', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData,
      signal: AbortSignal.timeout(300000) // 5分でタイムアウト
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('BOX upload error:', errorText)

      if (res.status === 409) {
        // 同名ファイルが存在する場合は新しいバージョンとしてアップロード
        console.log('同名ファイルが存在するため、新しいバージョンとしてアップロードを試行します')
        console.log('🔍 エラーレスポンステキスト:', errorText)

        try {
          // エラーレスポンスから既存ファイルIDを取得
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch (parseError) {
            console.error('❌ JSON パースエラー:', parseError)
            throw new Error('エラーレスポンスのJSONパースに失敗しました')
          }

          const existingFileId = errorData.context_info?.conflicts?.id

          console.log('🔍 409エラー詳細:', {
            errorData: JSON.stringify(errorData, null, 2),
            existingFileId,
            fileName: sanitizedFileName,
            folderId
          })

          if (existingFileId) {
            console.log(`📁 既存ファイルID: ${existingFileId} を使用して新バージョンをアップロード`)
            return await uploadNewVersionDirectly(new Uint8Array(fileData).buffer as ArrayBuffer, existingFileId)
          } else {
            console.log('🔍 ファイルIDが見つからないため、検索でアップロード')
            return await uploadNewVersionToBox(new Uint8Array(fileData).buffer as ArrayBuffer, sanitizedFileName, folderId)
          }
        } catch (versionError) {
          console.error('❌ 新しいバージョンのアップロードに失敗しました:', versionError)
          console.error('❌ エラー詳細:', {
            name: versionError.name,
            message: versionError.message,
            stack: versionError.stack
          })
          throw new Error('同名のファイルが既に存在します')
        }
      } else if (res.status === 413) {
        throw new Error('ファイルサイズが制限を超えています')
      } else if (res.status === 403) {
        throw new Error('このフォルダへのアップロード権限がありません')
      } else {
        throw new Error(`ファイルアップロードに失敗しました: ${res.status}`)
      }
    }

    const result = await res.json()
    // レスポンスからファイルIDを返す（entries[0].id）
    return result.entries?.[0]?.id || result.id
  } catch (error: any) {
    console.error('Upload file error:', error)
    throw error
  }
}

export async function getBoxFileInfo(fileId: string): Promise<any> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch(`https://api.box.com/2.0/files/${fileId}?fields=id,name,size,modified_at,created_at,path_collection`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`Box file info error ${res.status}: ${errorText}`)
  }
  return res.json()
}

export async function ensureProjectFolder(options: { name: string; parentFolderId: string }): Promise<{ id: string }> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch('https://api.box.com/2.0/folders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: options.name, parent: { id: options.parentFolderId } })
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Box create folder error ${res.status}: ${t}`)
  }
  const json: any = await res.json()
  return { id: json.id as string }
}

export async function createCompanyFolder(companyName: string): Promise<{ id: string }> {
  try {
    const accessToken = await getAppAuthAccessToken()
    const parentFolderId = getEnv('BOX_PROJECTS_ROOT_FOLDER_ID')

    const res = await fetch('https://api.box.com/2.0/folders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: companyName,
        parent: { id: parentFolderId }
      })
    })

    if (!res.ok) {
      if (res.status === 409) {
        const folders = await getBoxFolderItems(parentFolderId)
        const existingFolder = folders.find(item => item.type === 'folder' && item.name === companyName)
        if (existingFolder) {
          return { id: existingFolder.id }
        }
      }
      const errorText = await res.text()
      throw new Error(`Company folder creation failed ${res.status}: ${errorText}`)
    }

    const folder: any = await res.json()
    return { id: folder.id as string }

  } catch (error) {
    console.error('❌ Company folder creation failed:', error)
    throw error
  }
}

export async function addBoxCollaborator(folderId: string, email: string, role: 'viewer' | 'editor' | 'co-owner' = 'editor'): Promise<any> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch('https://api.box.com/2.0/collaborations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        item: {
          type: 'folder',
          id: folderId
        },
        accessible_by: {
          type: 'user',
          login: email
        },
        role: role,
        can_view_path: true
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('BOX collaboration error:', errorText)

      if (res.status === 400 && errorText.includes('already has access')) {
        console.warn('User already has access to this folder')
        return null
      }

      throw new Error(`BOX collaboration failed ${res.status}: ${errorText}`)
    }

    return res.json()

  } catch (error) {
    console.error('❌ BOX collaboration failed:', error)
    throw error
  }
}

export async function removeBoxCollaborator(collaborationId: string): Promise<void> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/collaborations/${collaborationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`BOX collaboration removal failed ${res.status}: ${errorText}`)
    }

  } catch (error) {
    console.error('❌ BOX collaboration removal failed:', error)
    throw error
  }
}

export async function getBoxFolderCollaborators(folderId: string): Promise<any[]> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/folders/${folderId}/collaborations`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`BOX collaborations fetch failed ${res.status}: ${errorText}`)
    }

    const data: any = await res.json()
    return data.entries || []

  } catch (error) {
    console.error('❌ BOX collaborations fetch failed:', error)
    throw error
  }
}

export async function renameBoxFolder(folderId: string, newName: string): Promise<any> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/folders/${folderId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: newName
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Box folder rename failed ${res.status}: ${errorText}`)
    }

    const folder: any = await res.json()
    console.log(`📁 Renamed folder to: ${newName} (ID: ${folderId})`)
    return folder

  } catch (error) {
    console.error('❌ Box folder rename failed:', error)
    throw error
  }
}

export async function moveBoxFile(fileId: string, newParentFolderId: string): Promise<any> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        parent: { id: newParentFolderId }
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Box file move failed ${res.status}: ${errorText}`)
    }

    const file: any = await res.json()
    console.log(`📄 Moved file: ${file.name} to folder ${newParentFolderId}`)
    return file

  } catch (error) {
    console.error('❌ Box file move failed:', error)
    throw error
  }
}

export async function deleteBoxFolder(folderId: string, recursive: boolean = true): Promise<void> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/folders/${folderId}?recursive=${recursive}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`📁 Folder ${folderId} not found, already deleted`)
        return
      }
      const errorText = await res.text()
      throw new Error(`Box folder deletion failed ${res.status}: ${errorText}`)
    }

    console.log(`📁 Successfully deleted folder: ${folderId}`)

  } catch (error) {
    console.error('❌ Box folder deletion failed:', error)
    throw error
  }
}

export async function deleteBoxFile(fileId: string): Promise<void> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`📄 File ${fileId} not found, already deleted`)
        return
      }
      const errorText = await res.text()
      throw new Error(`Box file deletion failed ${res.status}: ${errorText}`)
    }

    console.log(`📄 Successfully deleted file: ${fileId}`)

  } catch (error) {
    console.error('❌ Box file deletion failed:', error)
    throw error
  }
}

export async function createBoxSharedLink(fileId: string): Promise<string> {
  try {
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shared_link: {
          access: 'open',
          permissions: {
            can_download: true,
            can_preview: true
          }
        }
      })
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Box shared link creation failed ${res.status}: ${errorText}`)
    }

    const file: any = await res.json()
    const sharedLinkUrl = file.shared_link?.url

    if (!sharedLinkUrl) {
      throw new Error('Shared link URL not found in response')
    }

    console.log(`🔗 Created shared link for file ${fileId}: ${sharedLinkUrl}`)
    return sharedLinkUrl

  } catch (error) {
    console.error('❌ Box shared link creation failed:', error)
    throw error
  }
}

export async function createProjectFolderStructure(projectTitle: string, projectId: string, companyFolderId: string): Promise<{
  folderId: string;
  subfolders: Record<string, string>;
}> {
  try {
    const accessToken = await getAppAuthAccessToken()

    // メインプロジェクトフォルダを作成（会社フォルダ下）
    const mainFolderName = `[PRJ-${projectId.slice(0, 8)}] ${projectTitle}`


    const mainFolderRes = await fetch('https://api.box.com/2.0/folders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: mainFolderName,
        parent: { id: companyFolderId }
      })
    })

    let mainFolderId: string

    if (!mainFolderRes.ok) {
      if (mainFolderRes.status === 409) {
        // 同名のフォルダが既に存在する場合
        const errorData = await mainFolderRes.json()
        const conflicts = errorData?.context_info?.conflicts

        if (conflicts && conflicts.length > 0) {
          // 既存のフォルダIDを使用
          mainFolderId = conflicts[0].id
          console.log(`📁 Using existing folder: ${mainFolderName} (ID: ${mainFolderId})`)
        } else {
          throw new Error(`Main folder exists but conflict info not available: ${errorData}`)
        }
      } else {
        const errorText = await mainFolderRes.text()
        throw new Error(`Main folder creation failed ${mainFolderRes.status}: ${errorText}`)
      }
    } else {
      const mainFolder: any = await mainFolderRes.json()
      mainFolderId = mainFolder.id as string
      console.log(`📁 Created new folder: ${mainFolderName} (ID: ${mainFolderId})`)
    }



    // 既存のサブフォルダを取得
    const existingItems = await getBoxFolderItems(mainFolderId)
    const subfolders: Record<string, string> = {}
    const subfolderNames: Record<string, string> = {}

    // フォルダ名マッピング（Box内の実際のフォルダ名に対応）
    const folderMapping: Record<string, string[]> = {
      '作業内容': ['00_作業内容', '作業内容', '00_'],
      '受取': ['01_受取データ', '受取', '01_受取', '01_', '01受取データ'],
      '作業': ['02_作業フォルダ', '作業', '02_作業', '02_', '02作業フォルダ'],
      '納品': ['03_納品データ', '納品', '03_納品', '03_', '03納品データ'],
      '契約': ['04_契約資料', '契約', '04_契約', '04_', '04契約資料']
    }

    // 既存のフォルダから該当するサブフォルダを見つける
    existingItems.forEach(item => {
      if (item.type === 'folder') {
        const itemName = item.name

        // 各カテゴリに対してマッチングを確認
        Object.entries(folderMapping).forEach(([category, patterns]) => {
          patterns.forEach(pattern => {
            if (itemName.includes(pattern) && !subfolders[category]) {
              subfolders[category] = item.id
              subfolderNames[category] = itemName
              console.log(`📁 Found existing subfolder: ${category} -> ${itemName} (ID: ${item.id})`)
            }
          })
        })
      }
    })

    // 番号付き名称に正規化：
    // - 既に番号付きがある → それを採用
    // - 番号なしのみある → リネームして番号付きへ
    // - 両方ある → 番号付きを採用、番号なしは削除
    // - どちらもない → 番号付きで新規作成
    const expectedCategories = ['作業内容', '受取', '作業', '納品', '契約']
    const standardFolderNames: Record<string, string> = {
      '作業内容': '00_作業内容',
      '受取': '01_受取データ',
      '作業': '02_作業フォルダ',
      '納品': '03_納品データ',
      '契約': '04_契約資料'
    }

    // 番号なしフォルダのパターン（番号付きでないもの）
    const nonNumberedPatterns: Record<string, string[]> = {
      '作業内容': ['作業内容'],
      '受取': ['受取'],
      '作業': ['作業', '作業フォルダ'],
      '納品': ['納品'],
      '契約': ['契約', '契約資料']
    }

    for (const category of expectedCategories) {
      const standardName = standardFolderNames[category]

      // まず既に標準名のフォルダがあるか探す
      const exact = existingItems.find(
        (it: any) => it.type === 'folder' && it.name === standardName
      )

      if (exact) {
        subfolders[category] = exact.id
        subfolderNames[category] = standardName
        console.log(`✅ Found standard folder: ${standardName} (ID: ${exact.id})`)

        // 番号なしフォルダが残っている場合は削除
        const nonNumberedPats = nonNumberedPatterns[category] || []
        for (const pattern of nonNumberedPats) {
          const nonNumberedFolder = existingItems.find(
            (it: any) => it.type === 'folder' && it.name === pattern && it.id !== exact.id
          )
          if (nonNumberedFolder) {
            try {
              console.log(`🗑️ Deleting non-numbered folder: ${pattern} (ID: ${nonNumberedFolder.id})`)
              await deleteBoxFolder(nonNumberedFolder.id, true)
              console.log(`✅ Deleted non-numbered folder: ${pattern}`)
            } catch (deleteError: any) {
              console.warn(`⚠️ Failed to delete folder ${pattern}: ${deleteError.message}`)
            }
          }
        }
        continue
      }

      if (subfolders[category]) {
        // 番号なし等でマッチしている場合はリネームを試行
        const currentId = subfolders[category]
        const currentName = subfolderNames[category]
        if (currentName !== standardName) {
          try {
            await renameBoxFolder(currentId, standardName)
            subfolderNames[category] = standardName
            const targetItem = existingItems.find((it: any) => it.id === currentId)
            if (targetItem) {
              targetItem.name = standardName
            }
            console.log(`🔁 Renamed subfolder: ${currentName} -> ${standardName}`)
          } catch (e: any) {
            // リネームに失敗した場合は、既存のフォルダをそのまま使用
            console.warn(`⚠️ Rename failed (${currentName} -> ${standardName}). Using existing folder as-is.`, e?.message || e)
            // subfoldersとsubfolderNamesは既に設定されているので、何もしない
          }
        }
      } else {
        // 何も無いので標準名で作成
        try {
          const subFolderResult = await ensureProjectFolder({
            name: standardName,
            parentFolderId: mainFolderId
          })
          subfolders[category] = subFolderResult.id
          subfolderNames[category] = standardName
          console.log(`✅ Created subfolder: ${standardName} (ID: ${subFolderResult.id})`)
        } catch (error) {
          console.error(`❌ Failed to create subfolder ${standardName}:`, error)
        }
      }
    }

    return {
      folderId: mainFolderId,
      subfolders
    }

  } catch (error) {
    console.error('❌ Project folder structure creation failed:', error)
    throw error
  }
}


