import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // ストレージバケットの一覧を取得
    const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets()

    if (bucketsError) {
      console.error('バケット一覧取得エラー:', bucketsError)
      return NextResponse.json(
        { message: 'バケット一覧の取得に失敗しました', error: bucketsError.message },
        { status: 400 }
      )
    }

    // attachmentsバケットの情報を取得
    const attachmentsBucket = buckets?.find(bucket => bucket.id === 'attachments')

    return NextResponse.json({
      buckets: buckets,
      attachmentsBucket: attachmentsBucket
    }, { status: 200 })

  } catch (error) {
    console.error('ストレージバケット確認エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // attachmentsバケットを作成（存在しない場合）
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('attachments', {
      public: false,
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
      console.error('バケット作成エラー:', bucketError)
      return NextResponse.json(
        { message: 'ストレージバケットの作成に失敗しました', error: bucketError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'ストレージバケットを作成しました',
      bucket: bucketData
    }, { status: 200 })

  } catch (error) {
    console.error('ストレージバケット作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
