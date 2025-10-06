export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  try {
    const fileId = params.fileId

    // Box API で認証トークン取得
    const accessToken = await getAppAuthAccessToken()

    // ファイル情報を取得
    const fileInfoResponse = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!fileInfoResponse.ok) {
      console.error('Box ファイル情報取得失敗:', await fileInfoResponse.text())
      return NextResponse.json({ error: 'ファイルが見つかりません' }, { status: 404 })
    }

    const fileInfo = await fileInfoResponse.json()

    // ファイルコンテンツをダウンロード
    const downloadResponse = await fetch(`https://api.box.com/2.0/files/${fileId}/content`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!downloadResponse.ok) {
      console.error('Box ファイルダウンロード失敗:', await downloadResponse.text())
      return NextResponse.json({ error: 'ダウンロードに失敗しました' }, { status: 500 })
    }

    // ファイルコンテンツを取得
    const arrayBuffer = await downloadResponse.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // レスポンス作成
    const response = new NextResponse(buffer)

    // ヘッダー設定
    response.headers.set('Content-Type', getContentType(fileInfo.name))
    response.headers.set('Content-Length', buffer.length.toString())
    response.headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.name)}"`)
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')

    console.log('✅ ファイルダウンロード成功:', {
      fileId,
      fileName: fileInfo.name,
      size: buffer.length
    })

    return response

  } catch (error: any) {
    console.error('❌ ファイルダウンロードエラー:', error)
    return NextResponse.json({
      error: 'ダウンロードエラー',
      details: error.message
    }, { status: 500 })
  }
}

// ファイル拡張子からContent-Typeを判定
function getContentType(fileName: string): string {
  const extension = fileName.toLowerCase().split('.').pop()

  switch (extension) {
    case 'pdf':
      return 'application/pdf'
    case 'doc':
      return 'application/msword'
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'xls':
      return 'application/vnd.ms-excel'
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'png':
      return 'image/png'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'gif':
      return 'image/gif'
    case 'txt':
      return 'text/plain'
    default:
      return 'application/octet-stream'
  }
}