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
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({
        message: '認証に失敗しました',
        error: authError?.message
      }, { status: 401 })
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
    
    // ファイル情報を取得
    const fileInfo = await getBoxFileInfo(params.fileId)
    
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