import { NextResponse } from 'next/server'
import { getAppAuthAccessToken, getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = await getAppAuthAccessToken()
    const rootId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'
    let sample: any[] = []
    try {
      sample = await getBoxFolderItems(rootId)
    } catch (e: any) {
      return NextResponse.json({ ok: false, step: 'list-root', message: e?.message || String(e) }, { status: 500 })
    }
    return NextResponse.json({ ok: true, token: !!token, rootId, sampleCount: sample.length }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ ok: false, step: 'token', message: e?.message || String(e) }, { status: 500 })
  }
}


