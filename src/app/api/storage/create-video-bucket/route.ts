import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 動画ファイル専用のバケットを作成
    const { data: bucketData, error: bucketError } = await supabaseAdmin.storage.createBucket('video-attachments', {
      public: false,
      fileSizeLimit: 314572800, // 300MB
      allowedMimeTypes: [
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
      console.error('動画バケット作成エラー:', bucketError)
      return NextResponse.json(
        { message: '動画バケットの作成に失敗しました', error: bucketError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: '動画バケットを作成しました',
      bucket: bucketData
    }, { status: 200 })

  } catch (error) {
    console.error('動画バケット作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
