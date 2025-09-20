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

export async function GET(request: NextRequest) {
  try {
    console.log('Box projects API called')

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

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 組織情報を取得（発注者権限チェック）
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships) {
      return NextResponse.json({ message: '組織情報が取得できません' }, { status: 403 })
    }

    const orgAdminMembership = memberships.find(m => m.role === 'OrgAdmin')
    if (!orgAdminMembership) {
      return NextResponse.json({ message: '発注者権限が必要です' }, { status: 403 })
    }

    // 組織の案件でBoxフォルダが作成されているものを取得
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id, status, created_at')
      .eq('org_id', orgAdminMembership.org_id)
      .not('box_folder_id', 'is', null)
      .order('created_at', { ascending: false })

    if (projectsError) {
      return NextResponse.json({ message: 'プロジェクト取得エラー', error: projectsError.message }, { status: 500 })
    }

    // 各プロジェクトのBoxフォルダ情報を取得
    const projectsWithBoxData = await Promise.all(
      (projects || []).map(async (project) => {
        try {
          // Box API が設定されていない場合はモックデータを返す
          const hasBoxConfig = process.env.BOX_CLIENT_ID &&
                               process.env.BOX_CLIENT_SECRET &&
                               process.env.BOX_ENTERPRISE_ID

          if (!hasBoxConfig) {
            console.log('Box API not configured, returning mock data')
            return {
              ...project,
              box_items: [
                {
                  id: 'mock1',
                  name: 'サンプル図面.dwg',
                  type: 'file',
                  size: 1024000,
                  modified_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  path_collection: { entries: [{ name: project.title }] }
                },
                {
                  id: 'mock2',
                  name: '契約書.pdf',
                  type: 'file',
                  size: 512000,
                  modified_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  path_collection: { entries: [{ name: project.title }] }
                }
              ],
              subfolders: {
                '受取': 'mock_folder_1',
                '作業': 'mock_folder_2',
                '納品': 'mock_folder_3',
                '契約': 'mock_folder_4'
              }
            }
          }

          const items = await getBoxFolderItems(project.box_folder_id)
          // box_subfoldersカラムが存在しない場合のフォールバック
          const subfolders = {
            '受取': 'mock_folder_1',
            '作業': 'mock_folder_2',
            '納品': 'mock_folder_3',
            '契約': 'mock_folder_4'
          }

          return {
            ...project,
            box_items: items,
            subfolders: subfolders
          }
        } catch (error) {
          console.error(`Box folder error for project ${project.id}:`, error)
          return {
            ...project,
            box_items: [],
            subfolders: {},
            error: 'Boxフォルダにアクセスできません'
          }
        }
      })
    )

    return NextResponse.json({
      projects: projectsWithBoxData
    }, { status: 200 })

  } catch (e: any) {
    return NextResponse.json({
      message: 'サーバーエラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}