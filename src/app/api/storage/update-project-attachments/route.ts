import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // project-attachmentsバケットの設定を更新（動画ファイルのMIMEタイプを追加）
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage
      .updateBucket('project-attachments', {
        public: false,
        fileSizeLimit: 314572800, // 300MB
        allowedMimeTypes: [
          // 既存のMIMEタイプ
          'application/pdf',
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain',
          'application/zip',
          'application/x-rar-compressed',
          'application/dwg',
          'application/x-dwg',
          'image/vnd.dwg',
          'application/step',
          'application/step+zip',
          'application/octet-stream',
          'application/x-step',
          'application/x-sfc',
          'application/x-bfo',
          // 動画ファイルのMIMEタイプを追加
          'video/mp4',
          'video/avi',
          'video/mov',
          'video/wmv',
          'video/flv',
          'video/webm',
          'video/mkv'
        ]
      })

    if (bucketError) {
      console.error('project-attachmentsバケット更新エラー:', bucketError)
      return NextResponse.json(
        { message: 'project-attachmentsバケットの更新に失敗しました', error: bucketError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'project-attachmentsバケットの設定を更新しました',
      bucket: bucketData
    }, { status: 200 })

  } catch (error) {
    console.error('project-attachmentsバケット更新エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
