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

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    console.log('Box download API called for file:', params.fileId)

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

    // 現在はBOXアクセス権限が制限されているため、すべてのファイルをモックファイルとして扱う
    console.log('Mock file download requested for fileId:', params.fileId)
    const mockContent = `これは${params.fileId}のテストファイル内容です。

ファイルタイプ: サンプルドキュメント
作成日: ${new Date().toLocaleDateString('ja-JP')}
説明: BOX Business Starter承認後に実際のファイルがダウンロード可能になります。`

    const buffer = Buffer.from(mockContent, 'utf-8')

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': 'attachment; filename="sample-file.txt"',
        'Content-Length': buffer.length.toString()
      }
    })

    /* 実際のBOXファイルダウンロード（Business Starter承認後に有効化）
    const accessToken = await getAppAuthAccessToken()

    // BOXファイル情報を取得
    const fileInfoRes = await fetch(`https://api.box.com/2.0/files/${params.fileId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!fileInfoRes.ok) {
      throw new Error(`File info error ${fileInfoRes.status}: ${await fileInfoRes.text()}`)
    }

    const fileInfo: any = await fileInfoRes.json()
    console.log('File info:', fileInfo.name, fileInfo.size)

    // BOXからファイル内容をダウンロード
    const downloadRes = await fetch(`https://api.box.com/2.0/files/${params.fileId}/content`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!downloadRes.ok) {
      throw new Error(`File download error ${downloadRes.status}: ${await downloadRes.text()}`)
    }

    // ファイル内容をストリームとして返す
    const fileBuffer = await downloadRes.arrayBuffer()

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.name)}"`,
        'Content-Length': fileBuffer.byteLength.toString()
      }
    })
    */

  } catch (e: any) {
    console.error('Box download API error:', e)
    return NextResponse.json({
      message: 'ファイルダウンロードエラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}