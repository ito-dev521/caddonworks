import { NextRequest, NextResponse } from 'next/server'
import { createCompanyFolder } from '@/lib/box'

export async function POST(request: NextRequest) {
  try {
    const { companyName } = await request.json()

    if (!companyName) {
      return NextResponse.json({ message: '会社名が必要です' }, { status: 400 })
    }

    const { id: folderId } = await createCompanyFolder(companyName)

    return NextResponse.json({ folderId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({
      message: '会社フォルダ作成エラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}