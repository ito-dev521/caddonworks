import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
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
      message: 'バケット一覧を取得しました',
      buckets: buckets?.map(b => ({ 
        id: b.id, 
        name: b.name, 
        public: b.public,
        file_size_limit: b.file_size_limit,
        allowed_mime_types: b.allowed_mime_types
      })),
      projectAttachmentsExists: bucketExists,
      totalBuckets: buckets?.length || 0
    }, { status: 200 })

  } catch (error) {
    console.error('バケット確認エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
