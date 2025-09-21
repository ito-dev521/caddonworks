import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import BoxSDK from 'box-node-sdk'
import JSZip from 'jszip'

interface BoxItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size?: number
  modified_at?: string
  path_collection?: {
    entries: Array<{
      id: string
      name: string
    }>
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const projectId = params.projectId

    if (!projectId) {
      return NextResponse.json({ message: 'プロジェクトIDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id, org_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    if (!project.box_folder_id) {
      return NextResponse.json({ message: 'このプロジェクトにはBOXフォルダが関連付けられていません' }, { status: 404 })
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id
    const isContractor = membership.role === 'Contractor'

    if (!isOrgAdmin && !isContractor) {
      return NextResponse.json({ message: 'このプロジェクトのファイルにアクセスする権限がありません' }, { status: 403 })
    }

    if (!process.env.BOX_CLIENT_ID || !process.env.BOX_CLIENT_SECRET || !process.env.BOX_PRIVATE_KEY) {
      return NextResponse.json({ message: 'BOX設定が不完全です' }, { status: 500 })
    }

    const sdk = new BoxSDK({
      clientID: process.env.BOX_CLIENT_ID,
      clientSecret: process.env.BOX_CLIENT_SECRET,
      appAuth: {
        keyID: process.env.BOX_KEY_ID!,
        privateKey: process.env.BOX_PRIVATE_KEY.replace(/\\n/g, '\n'),
        passphrase: process.env.BOX_PASSPHRASE!
      }
    })

    const client = sdk.getAppAuthClient('enterprise', process.env.BOX_ENTERPRISE_ID!)

    const zip = new JSZip()

    const addFilesToZip = async (folderId: string, folderPath: string = '') => {
      try {
        const items = await client.folders.getItems(folderId, {
          fields: 'id,name,type,size,modified_at'
        })

        for (const item of items.entries) {
          const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name

          if (item.type === 'folder') {
            await addFilesToZip(item.id, itemPath)
          } else if (item.type === 'file') {
            try {
              const fileStream = await client.files.getReadStream(item.id)
              const chunks: Buffer[] = []

              await new Promise<void>((resolve, reject) => {
                fileStream.on('data', (chunk: Buffer) => {
                  chunks.push(chunk)
                })
                fileStream.on('end', () => resolve())
                fileStream.on('error', reject)
              })

              const fileBuffer = Buffer.concat(chunks)
              zip.file(itemPath, fileBuffer)
            } catch (fileError) {
              console.error(`ファイル ${item.name} の取得でエラー:`, fileError)
            }
          }
        }
      } catch (error) {
        console.error(`フォルダ ${folderId} の処理でエラー:`, error)
      }
    }

    await addFilesToZip(project.box_folder_id)

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' })

    const sanitizedTitle = project.title.replace(/[<>:"/\\|?*]/g, '_')
    const filename = `${sanitizedTitle}_files.zip`

    const body = new Uint8Array(zipBuffer)

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Content-Length': zipBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('一括ダウンロードAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}