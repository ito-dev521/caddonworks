import { NextRequest, NextResponse } from 'next/server'
import { getAppAuthAccessToken } from '@/lib/box'

export async function DELETE(request: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // アクセストークン（Boxアプリ用）を取得
    const accessToken = await getAppAuthAccessToken()

    const res = await fetch(`https://api.box.com/2.0/files/${params.fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    if (!res.ok) {
      const text = await res.text()
      let status = res.status || 500
      return NextResponse.json({ message: '削除に失敗しました', error: text }, { status })
    }

    return NextResponse.json({ message: '削除しました' }, { status: 200 })
  } catch (e: any) {
    const msg = String(e?.message || e)
    return NextResponse.json({ message: 'サーバーエラーが発生しました', error: msg }, { status: 500 })
  }
}


