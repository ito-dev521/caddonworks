export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { uploadFileToBox } from '@/lib/box'
import { boxUploadRateLimit } from '@/lib/rate-limiter'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: { folderId: string } }
) {
  try {
    console.log('Box upload API called for folder:', params.folderId)

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

    // レート制限チェック
    const userIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const rateLimitKey = `upload_${user.id}_${userIp}`

    if (!boxUploadRateLimit(rateLimitKey)) {
      return NextResponse.json({
        message: 'アップロード回数の制限に達しました。しばらく待ってから再試行してください。'
      }, { status: 429 })
    }

    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'ファイルが指定されていません' }, { status: 400 })
    }

    // ファイルサイズ制限（100MB）
    const maxSize = 100 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json({
        message: 'ファイルサイズが大きすぎます（最大100MB）'
      }, { status: 400 })
    }

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()

    // モックフォルダの場合は成功レスポンスを返す
    if (params.folderId.startsWith('mock_') || params.folderId.startsWith('pending_')) {
      console.log('Mock folder upload, returning success response')
      return NextResponse.json({
        success: true,
        message: 'ファイルをアップロードしました（テスト環境）',
        file: {
          id: `mock_uploaded_${Date.now()}`,
          name: file.name,
          size: file.size
        }
      }, { status: 200 })
    }

    // 実際のBOXにアップロード
    const result = await uploadFileToBox(params.folderId, file.name, arrayBuffer)

    console.log('File uploaded successfully:', file.name)

    return NextResponse.json({
      success: true,
      message: 'ファイルをアップロードしました',
      file: result.entries[0]
    }, { status: 200 })

  } catch (error: any) {
    console.error('Box upload error:', error)
    return NextResponse.json({
      message: 'ファイルアップロードエラー',
      error: error.message
    }, { status: 500 })
  }
}