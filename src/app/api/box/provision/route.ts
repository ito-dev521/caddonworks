export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

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
  const jti = crypto.randomBytes(16).toString('hex')
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
    throw new Error(`Box token error ${res.status}: ${await res.text()}`)
  }
  const json: any = await res.json()
  return json.access_token as string
}

async function createBoxFolder(name: string, parentId: string): Promise<string> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch('https://api.box.com/2.0/folders', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, parent: { id: parentId } })
  })
  if (!res.ok) {
    throw new Error(`Box create folder error ${res.status}: ${await res.text()}`)
  }
  const data: any = await res.json()
  return data.id as string
}

export async function POST(request: NextRequest) {
  try {

    // 環境変数チェック
    const requiredEnvs = ['BOX_CLIENT_ID', 'BOX_CLIENT_SECRET', 'BOX_ENTERPRISE_ID', 'BOX_JWT_PRIVATE_KEY', 'BOX_JWT_PRIVATE_KEY_PASSPHRASE', 'BOX_PUBLIC_KEY_ID']
    const missingEnvs = requiredEnvs.filter(env => !process.env[env])

    if (missingEnvs.length > 0) {
      console.error('Missing BOX environment variables:', missingEnvs)
      return NextResponse.json({
        message: 'BOX環境変数が設定されていません',
        missing: missingEnvs
      }, { status: 500 })
    }

    const { name, parentId, subfolders } = await request.json()

    if (!name) {
      return NextResponse.json({ message: 'フォルダ名が必要です' }, { status: 400 })
    }

    if (!parentId) {
      return NextResponse.json({ message: '親フォルダIDが必要です' }, { status: 400 })
    }

    // メインフォルダを作成
    const folderId = await createBoxFolder(name, parentId)
    

    // サブフォルダも作成
    const subfolderIds: Record<string, string> = {}
    if (subfolders && Array.isArray(subfolders)) {
      for (const subfolderName of subfolders) {
        const subfolderId = await createBoxFolder(subfolderName, folderId)
        subfolderIds[subfolderName] = subfolderId
      }
    }
    
    return NextResponse.json({
      folderId,
      subfolderIds
    }, { status: 200 })
  } catch (e: any) {
    console.error('BOX provision error:', e)
    return NextResponse.json({
      message: 'Box APIエラー',
      error: String(e?.message || e),
      stack: e?.stack
    }, { status: 500 })
  }
}