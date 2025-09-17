import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 既存のバケットを確認
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketError) {
      console.error('バケット一覧取得エラー:', bucketError)
      return NextResponse.json({ 
        message: 'バケット一覧の取得に失敗しました',
        error: bucketError.message
      }, { status: 500 })
    }

    const bucketExists = buckets?.some(bucket => bucket.id === 'project-attachments')
    
    return NextResponse.json({
      message: 'ストレージバケットの状況を確認しました',
      buckets: buckets?.map(b => ({ 
        id: b.id, 
        name: b.name, 
        public: b.public,
        file_size_limit: b.file_size_limit,
        allowed_mime_types: b.allowed_mime_types
      })),
      projectAttachmentsExists: bucketExists,
      totalBuckets: buckets?.length || 0,
      needsCreation: !bucketExists
    }, { status: 200 })

  } catch (error) {
    console.error('ストレージ確認エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 既存のバケットを確認
    const { data: existingBuckets, error: bucketListError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketListError) {
      console.error('バケット一覧取得エラー:', bucketListError)
      return NextResponse.json({ 
        message: 'バケット一覧の取得に失敗しました',
        error: bucketListError.message
      }, { status: 500 })
    }

    const bucketExists = existingBuckets?.some(bucket => bucket.id === 'project-attachments')
    
    if (bucketExists) {
      return NextResponse.json({ 
        message: 'project-attachmentsバケットは既に存在します',
        buckets: existingBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public }))
      }, { status: 200 })
    }

    // バケットを作成
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('project-attachments', {
      public: false,
      fileSizeLimit: 209715200, // 200MB
      allowedMimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/zip',
        'application/x-rar-compressed',
        'application/x-rar',
        'application/octet-stream',
        'text/plain'
      ]
    })

    if (bucketError) {
      console.error('バケット作成エラー:', bucketError)
      return NextResponse.json({ 
        message: 'バケットの作成に失敗しました',
        error: bucketError.message
      }, { status: 500 })
    }

    console.log('バケット作成成功:', bucketData)

    return NextResponse.json({
      message: 'project-attachmentsバケットが正常に作成されました',
      bucket: bucketData,
      existingBuckets: existingBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public }))
    }, { status: 201 })

  } catch (error) {
    console.error('バケット作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
