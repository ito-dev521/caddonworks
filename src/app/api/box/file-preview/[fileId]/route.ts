import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * Boxファイルのプレビュー用URL取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId
    console.log('📁 File preview request for fileId:', fileId)

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      console.error('❌ No authorization header')
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ Auth error:', authError)
      return NextResponse.json({
        message: '認証に失敗しました',
        error: authError?.message
      }, { status: 401 })
    }

    console.log('✅ User authenticated:', user.email)

    // Boxアクセストークンを取得
    const accessToken = await getAppAuthAccessToken()
    console.log('✅ Box access token obtained')

    // ファイル情報を取得して権限チェック
    console.log(`🔍 Fetching file info from Box API: ${fileId}`)
    const fileInfoRes = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!fileInfoRes.ok) {
      const errorText = await fileInfoRes.text()
      console.error('❌ Box API error:', fileInfoRes.status, errorText)
      return NextResponse.json({
        message: 'ファイル情報の取得に失敗しました',
        error: errorText,
        boxStatus: fileInfoRes.status
      }, { status: fileInfoRes.status })
    }

    const fileInfo = await fileInfoRes.json()

    // 共有リンクを作成または取得（プレビュー専用）
    let sharedLink = fileInfo.shared_link

    if (!sharedLink) {
      // 共有リンクを作成
      const createSharedLinkRes = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shared_link: {
            access: 'open', // 認証なしでアクセス可能
            permissions: {
              can_download: false,
              can_preview: true
            }
          }
        })
      })

      if (!createSharedLinkRes.ok) {
        console.error('共有リンク作成エラー:', await createSharedLinkRes.text())
        // 共有リンクの作成に失敗した場合は、アクセストークン方式にフォールバック
        return NextResponse.json({
          fileId: fileId,
          fileName: fileInfo.name,
          accessToken: accessToken,
          expiration: Date.now() + 3600000 // 1時間後に期限切れ
        }, { status: 200 })
      }

      const updatedFileInfo = await createSharedLinkRes.json()
      sharedLink = updatedFileInfo.shared_link
    }

    // Box Preview Embed用のURLを返す
    // 共有リンクを使用することで、特定のファイルのみが表示される
    return NextResponse.json({
      fileId: fileId,
      fileName: fileInfo.name,
      sharedLinkUrl: sharedLink.url,
      accessToken: accessToken,
      expiration: Date.now() + 3600000 // 1時間後に期限切れ
    }, { status: 200 })

  } catch (error: any) {
    console.error('File preview error:', error)
    return NextResponse.json({
      message: 'プレビュー情報の取得に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
