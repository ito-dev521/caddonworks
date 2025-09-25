export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getBoxFolderItems } from '@/lib/box'

export async function GET(request: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    // 簡易チェック（デバッグ/開発環境向け）: ヘッダーがあることのみ確認
    if (!token) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    

    // 実際のBOXフォルダの内容を取得
    const items = await getBoxFolderItems(params.folderId)

    
    return NextResponse.json({
      items: items,
      folder_id: params.folderId
    }, { status: 200 })

  } catch (e: any) {
    console.error('Box folder API error:', e)
    const msg = String(e?.message || e)
    // Boxの典型的なエラー文言からHTTPステータスを推定
    let status = 500
    if (/\b403\b/.test(msg)) status = 403
    if (/\b404\b/.test(msg)) status = 404
    if (/timeout/i.test(msg)) status = 504

    return NextResponse.json({
      message: 'BOXフォルダ取得エラー',
      error: msg
    }, { status })
  }
}