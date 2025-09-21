import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

function getEnv(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Env ${name} is not set`)
  return v
}

async function getAppAuthAccessToken(): Promise<string> {
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
    body
  })
  if (!res.ok) {
    const t = await res.text()
    throw new Error(`Box token error ${res.status}: ${t}`)
  }
  const json: any = await res.json()
  return json.access_token as string
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

export async function createProjectFolderStructure(projectTitle: string, projectId: string): Promise<{
  folderId: string;
  subfolders: Record<string, string>;
}> {
  try {
    const accessToken = await getAppAuthAccessToken()
    const parentFolderId = getEnv('BOX_PROJECTS_ROOT_FOLDER_ID')

    // メインプロジェクトフォルダを作成
    const mainFolderName = `${projectTitle}_${projectId.slice(0, 8)}`
    console.log(`Creating main folder: ${mainFolderName}`)

    const mainFolderRes = await fetch('https://api.box.com/2.0/folders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: mainFolderName,
        parent: { id: parentFolderId }
      })
    })

    if (!mainFolderRes.ok) {
      const errorText = await mainFolderRes.text()
      throw new Error(`Main folder creation failed ${mainFolderRes.status}: ${errorText}`)
    }

    const mainFolder: any = await mainFolderRes.json()
    const mainFolderId = mainFolder.id as string

    console.log(`✅ Main folder created: ${mainFolderId}`)

    // サブフォルダを作成
    const subfolderNames = ['受取', '作業', '納品', '契約']
    const subfolders: Record<string, string> = {}

    for (const subfolderName of subfolderNames) {
      console.log(`Creating subfolder: ${subfolderName}`)

      const subfolderRes = await fetch('https://api.box.com/2.0/folders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: subfolderName,
          parent: { id: mainFolderId }
        })
      })

      if (!subfolderRes.ok) {
        console.warn(`Subfolder creation failed for ${subfolderName}: ${subfolderRes.status}`)
        continue
      }

      const subfolder: any = await subfolderRes.json()
      subfolders[subfolderName] = subfolder.id as string
      console.log(`✅ Subfolder created: ${subfolderName} (${subfolder.id})`)
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


