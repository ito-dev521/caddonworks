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
 * Box Direct Upload用のプリフライトAPIエンドポイント
 * ブラウザから直接Boxにアップロードするための一時的なアップロードURLを取得
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({
        message: '認証に失敗しました',
        error: authError?.message
      }, { status: 401 })
    }

    const body = await request.json()
    const { folderId, fileName, fileSize } = body

    if (!folderId || !fileName || !fileSize) {
      return NextResponse.json({
        message: 'フォルダID、ファイル名、ファイルサイズが必要です'
      }, { status: 400 })
    }

    // ファイルサイズ制限（15GB = Business Plusの制限）
    const maxSize = 15 * 1024 * 1024 * 1024 // 15GB
    if (fileSize > maxSize) {
      return NextResponse.json({
        message: 'ファイルサイズが大きすぎます（最大15GB）'
      }, { status: 400 })
    }

    // Box APIアクセストークンを取得
    const accessToken = await getAppAuthAccessToken()

    // Box Direct Upload用のプリフライトチェック
    // これにより、アップロード可能かチェックし、アップロードURLを取得
    const preflightResponse = await fetch('https://api.box.com/2.0/files/content', {
      method: 'OPTIONS',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: fileName,
        size: fileSize,
        parent: {
          id: folderId
        }
      })
    })

    if (!preflightResponse.ok) {
      const errorText = await preflightResponse.text()
      console.error('Box preflight error:', errorText)
      return NextResponse.json({
        message: 'アップロード前チェックに失敗しました',
        error: errorText
      }, { status: preflightResponse.status })
    }

    // Box Upload用の一時的なアクセストークンとアップロードURLを返す
    return NextResponse.json({
      uploadUrl: 'https://upload.box.com/api/2.0/files/content',
      accessToken: accessToken,
      folderId: folderId,
      fileName: fileName,
      fileSize: fileSize
    }, { status: 200 })

  } catch (error: any) {
    console.error('Upload preflight error:', error)
    return NextResponse.json({
      message: 'プリフライトエラー',
      error: error.message
    }, { status: 500 })
  }
}
