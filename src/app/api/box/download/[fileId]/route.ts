export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { downloadBoxFile, getBoxFileInfo } from '@/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

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

    // モックファイルの場合はサンプルコンテンツを返す
    if (params.fileId.startsWith('mock_')) {
      console.log('Mock file download requested for fileId:', params.fileId)
      const mockContent = `これは${params.fileId}のテストファイル内容です。

ファイルタイプ: サンプルドキュメント
作成日: ${new Date().toLocaleDateString('ja-JP')}
説明: BOX承認後に実際のファイルがダウンロード可能になります。

このファイルは表示・テスト目的のサンプルファイルです。
実際のプロジェクトファイルはBOX連携完了後にご利用いただけます。`

      const buffer = Buffer.from(mockContent, 'utf-8')

      return new NextResponse(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': 'attachment; filename="sample-file.txt"',
          'Content-Length': buffer.length.toString()
        }
      })
    }

    // BOX設定がない場合はエラーレスポンス
    const hasBoxConfig = process.env.BOX_CLIENT_ID &&
                         process.env.BOX_CLIENT_SECRET &&
                         process.env.BOX_ENTERPRISE_ID

    if (!hasBoxConfig) {
      return NextResponse.json({
        message: 'BOX設定が未完了です。管理者にお問い合わせください。'
      }, { status: 503 })
    }

    // 実際のBOXファイルダウンロード
    console.log('Downloading real file from BOX:', params.fileId)

    // ファイル情報を取得
    const fileInfo = await getBoxFileInfo(params.fileId)
    console.log('File info:', fileInfo.name, fileInfo.size)

    // ファイル内容をダウンロード
    const downloadResponse = await downloadBoxFile(params.fileId)
    const fileBuffer = await downloadResponse.arrayBuffer()

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileInfo.name)}"`,
        'Content-Length': fileBuffer.byteLength.toString()
      }
    })

  } catch (e: any) {
    console.error('Box download API error:', e)
    return NextResponse.json({
      message: 'ファイルダウンロードエラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}