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
  // フォルダのみを返す（発注者デモと同じ表示にするため）
  const allItems = data.entries || []
  return allItems.filter((item: any) => item.type === 'folder')
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

    // 組織のすべての案件を取得（BOX連携の有無に関わらず）
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id, status, created_at')
      .eq('org_id', orgAdminMembership.org_id)
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
                  id: 'mock_folder',
                  name: 'テストフォルダ',
                  type: 'folder',
                  size: undefined,
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

          // BOXフォルダIDがない場合はモックデータを返す
          if (!project.box_folder_id) {
            return {
              ...project,
              box_items: [
                {
                  id: 'mock_folder_1',
                  name: 'テストフォルダ',
                  type: 'folder',
                  size: undefined,
                  modified_at: new Date().toISOString(),
                  created_at: new Date().toISOString(),
                  path_collection: { entries: [{ name: project.title }] }
                }
              ],
              subfolders: {
                '受取': 'pending_1',
                '作業': 'pending_2',
                '納品': 'pending_3',
                '契約': 'pending_4'
              }
            }
          }

          const items = await getBoxFolderItems(project.box_folder_id)

          // 実際のサブフォルダIDを取得
          const subfolders: Record<string, string> = {}

          // BOXフォルダ内のアイテムからサブフォルダを特定
          console.log(`Mapping subfolders for project ${project.title}...`)
          items.forEach(item => {
            if (item.type === 'folder') {
              const name = item.name
              console.log(`Checking folder: "${name}"`)
              // フォルダ名に基づいてマッピング
              if (name.includes('受取') || name === '01_受取データ') {
                subfolders['受取'] = item.id
                console.log(`Mapped: 受取 → ${item.id}`)
              } else if (name.includes('作業') || name === '02_作業フォルダ') {
                subfolders['作業'] = item.id
                console.log(`Mapped: 作業 → ${item.id}`)
              } else if (name.includes('納品') || name === '03_納品データ') {
                subfolders['納品'] = item.id
                console.log(`Mapped: 納品 → ${item.id}`)
              } else if (name.includes('契約') || name === '04_契約資料') {
                subfolders['契約'] = item.id
                console.log(`Mapped: 契約 → ${item.id}`)
              } else {
                console.log(`No mapping for folder: "${name}"`)
              }
            }
          })

          // フォールバック（フォルダが見つからない場合）
          if (Object.keys(subfolders).length === 0) {
            Object.assign(subfolders, {
              '受取': 'mock_folder_1',
              '作業': 'mock_folder_2',
              '納品': 'mock_folder_3',
              '契約': 'mock_folder_4'
            })
          }

          // サブフォルダ内のファイルも取得して最近のファイルに含める
          const allRecentFiles: any[] = [...items.filter(item => item.type === 'file')]

          // 各サブフォルダからファイルを取得
          console.log(`Project ${project.title}: Found subfolders:`, subfolders)
          for (const [folderName, folderId] of Object.entries(subfolders)) {
            try {
              if (!folderId.startsWith('mock_') && !folderId.startsWith('pending_')) {
                console.log(`Accessing subfolder ${folderName} (${folderId})...`)
                try {
                  const subFolderItems = await getBoxFolderItems(folderId)
                  console.log(`Subfolder ${folderName} has ${subFolderItems.length} items`)
                  subFolderItems.forEach(item => {
                    console.log(`  - ${item.name} (type: ${item.type})`)
                  })
                  const subFiles = subFolderItems
                    .filter(item => item.type === 'file')
                    .map(item => ({ ...item, subfolder: folderName })) // どのサブフォルダかを記録
                  console.log(`Found ${subFiles.length} files in ${folderName}`)
                  allRecentFiles.push(...subFiles)
                } catch (subError) {
                  console.error(`Error accessing subfolder ${folderName} (${folderId}):`, subError)
                }
              } else {
                console.log(`Skipping mock/pending folder ${folderName} (${folderId})`)
              }
            } catch (error) {
              console.log(`Could not access subfolder ${folderName} (${folderId}):`, error)
            }
          }

          // 最新5件の時間順でソート
          const recentFiles = allRecentFiles
            .sort((a, b) => new Date(b.modified_at).getTime() - new Date(a.modified_at).getTime())
            .slice(0, 10) // 少し多めに取得

          console.log(`Project ${project.title}: Total recent files: ${recentFiles.length}`)
          console.log(`Recent files:`, recentFiles.map(f => `${f.name} (${f.subfolder || 'root'})`))

          return {
            ...project,
            box_items: items,
            subfolders: subfolders,
            recent_files: recentFiles // 新しく追加
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