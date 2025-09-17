import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // ストレージバケットの設定を更新
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .updateBucket('attachments', {
        fileSizeLimit: 314572800, // 300MB
        allowedMimeTypes: [
          // 画像ファイル
          'image/jpeg',
          'image/png', 
          'image/gif',
          'image/webp',
          // 動画ファイル
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'video/flv',
          'video/webm',
          'video/mkv',
          // 文書ファイル
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-zip-compressed',
          // CADファイル
          'application/dwg',
          'application/x-dwg',
          'application/acad',
          'application/x-acad',
          'application/step',
          'application/x-step',
          'application/iges',
          'application/x-iges',
          'application/octet-stream'
        ]
      })

    if (bucketError) {
      console.error('バケット更新エラー:', bucketError)
      return NextResponse.json(
        { message: 'ストレージバケットの更新に失敗しました', error: bucketError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'ストレージバケットの設定を更新しました',
      bucket: bucketData
    }, { status: 200 })

  } catch (error) {
    console.error('ストレージバケット更新エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
