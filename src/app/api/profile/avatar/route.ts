import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('avatar') as File

    if (!file) {
      return NextResponse.json(
        { message: 'ファイルが必要です' },
        { status: 400 }
      )
    }

    // ユーザーの認証
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { message: 'ファイルサイズが大きすぎます（5MB以下にしてください）' },
        { status: 400 }
      )
    }

    // ファイルタイプチェック（画像のみ）
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { message: 'サポートされていないファイル形式です（JPEG、PNG、GIF、WebPのみ）' },
        { status: 400 }
      )
    }

    // ファイルをSupabase Storageにアップロード
    const fileExt = file.name.split('.').pop()
    const fileName = `avatar-${userProfile.id}-${Date.now()}.${fileExt}`
    const filePath = `avatars/${fileName}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // 既存のファイルを上書き
      })

    if (uploadError) {
      console.error('アバターアップロードエラー:', uploadError)
      return NextResponse.json(
        { message: 'ファイルのアップロードに失敗しました: ' + uploadError.message },
        { status: 400 }
      )
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // ユーザープロフィールのavatar_urlを更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ avatar_url: publicUrl })
      .eq('id', userProfile.id)

    if (updateError) {
      console.error('アバターURL更新エラー:', updateError)
      return NextResponse.json(
        { message: 'プロフィールの更新に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'アバターが更新されました',
      avatar_url: publicUrl
    })

  } catch (error) {
    console.error('アバターアップロードAPI エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

