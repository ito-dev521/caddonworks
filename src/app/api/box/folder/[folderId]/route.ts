export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import jwt, { SignOptions } from 'jsonwebtoken'
import crypto from 'crypto'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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

async function getBoxFolderItems(folderId: string): Promise<any[]> {
  const accessToken = await getAppAuthAccessToken()
  const res = await fetch(`https://api.box.com/2.0/folders/${folderId}/items`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })
  if (!res.ok) {
    throw new Error(`Box folder items error ${res.status}: ${await res.text()}`)
  }
  const data: any = await res.json()
  return data.entries || []
}

export async function GET(request: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    console.log('Box folder API called for folder:', params.folderId)

    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.log('No authorization header')
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    console.log('Token received:', token.substring(0, 20) + '...')

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({
        message: '認証に失敗しました',
        error: authError?.message
      }, { status: 401 })
    }

    console.log('User authenticated:', user.id)

    // フォルダの内容を取得
    const items = await getBoxFolderItems(params.folderId)

    console.log(`Retrieved ${items.length} items from folder ${params.folderId}`)

    return NextResponse.json({
      items: items,
      folder_id: params.folderId
    }, { status: 200 })

  } catch (e: any) {
    console.error('Box folder API error:', e)
    return NextResponse.json({
      message: 'BOXフォルダ取得エラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}