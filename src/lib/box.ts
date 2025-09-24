import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Environment variable ${name} is not set`)
  return v
}

function validateFileSize(size: number, maxSizeMB: number = 100): void {
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
    const privateKey = getEnv('BOX_JWT_PRIVATE_KEY').replace(/\\n/g, '\n')
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

export async function uploadFileToBox(folderId: string, fileName: string, fileData: ArrayBuffer): Promise<any> {
  try {
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
        throw new Error('同名のファイルが既に存在します')
      } else if (res.status === 413) {
        throw new Error('ファイルサイズが制限を超えています')
      } else if (res.status === 403) {
        throw new Error('このフォルダへのアップロード権限がありません')
      } else {
        throw new Error(`ファイルアップロードに失敗しました: ${res.status}`)
      }
    }

    return res.json()
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

    // フォルダ名マッピング（Box内の実際のフォルダ名に対応）
    const folderMapping: Record<string, string[]> = {
      '受取': ['01_受取データ', '受取', '01_受取', '01_'],
      '作業': ['02_作業データ', '作業', '02_作業', '02_'],
      '納品': ['03_納品データ', '納品', '03_納品', '03_'],
      '契約': ['04_契約データ', '契約', '04_契約', '04_']
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
              console.log(`📁 Found existing subfolder: ${category} -> ${itemName} (ID: ${item.id})`)
            }
          })
        })
      }
    })

    // 見つからないサブフォルダがあればログに記録（作成はしない）
    const expectedCategories = ['受取', '作業', '納品', '契約']
    expectedCategories.forEach(category => {
      if (!subfolders[category]) {
        console.warn(`📁 Subfolder not found for category: ${category}`)
      }
    })

    return {
      folderId: mainFolderId,
      subfolders
    }

  } catch (error) {
    console.error('❌ Project folder structure creation failed:', error)
    throw error
  }
}


