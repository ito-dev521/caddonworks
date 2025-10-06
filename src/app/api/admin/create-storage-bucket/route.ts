import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    
    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 管理者権限チェック
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)
      .eq('role', 'Admin')
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

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
