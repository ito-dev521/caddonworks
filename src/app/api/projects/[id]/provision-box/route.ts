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

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id
    if (!projectId) return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .eq('id', projectId)
      .single()

    if (error) return NextResponse.json({ message: 'プロジェクト取得エラー', error: String(error.message || error) }, { status: 500 })
    if (!project) return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })

    if (project.box_folder_id) return NextResponse.json({ folderId: project.box_folder_id }, { status: 200 })

    const parentId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID
    if (!parentId) return NextResponse.json({ message: 'BOX_PROJECTS_ROOT_FOLDER_ID が未設定です' }, { status: 500 })

    const name = `[PRJ-${project.id.slice(0, 8)}] ${project.title}`
    const folderId = await createBoxFolder(name, parentId)

    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ box_folder_id: folderId })
      .eq('id', project.id)

    if (updateError) {
      const msg = String(updateError.message || updateError)
      if (msg.includes('box_folder_id')) {
        return NextResponse.json({
          message: 'projects.box_folder_id カラムが存在しません。DBにカラムを追加してください。',
          hint_sql: "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS box_folder_id text;"
        }, { status: 500 })
      }
      return NextResponse.json({ message: 'projects 更新エラー', error: msg }, { status: 500 })
    }

    return NextResponse.json({ folderId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: 'サーバーエラー', error: String(e?.message || e) }, { status: 500 })
  }
}
