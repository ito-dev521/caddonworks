import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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
    const file = formData.get('file') as File
    const roomId = formData.get('roomId') as string
    const comment = formData.get('comment') as string

    if (!file || !roomId) {
      return NextResponse.json(
        { message: 'ファイルとルームIDが必要です' },
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

    // ルームIDからプロジェクトIDを取得
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('project_id, id')
      .eq('id', roomId)
      .single()

    if (roomError || !chatRoom) {
      return NextResponse.json(
        { message: 'チャットルームが見つかりません' },
        { status: 404 }
      )
    }

    const projectId = chatRoom.project_id

    // 返信情報を取得
    const replyTo = formData.get('reply_to') as string

    // プロジェクトの存在確認とアクセス権限チェック
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, contractor_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    // アクセス権限をチェック
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    const hasAccess = membership?.org_id === project.org_id || project.contractor_id === userProfile.id

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'このプロジェクトへのアクセス権限がありません' },
        { status: 403 }
      )
    }

    // ファイルサイズチェック（動画ファイルは300MB、その他は100MB制限）
    const isVideoFile = file.type.startsWith('video/')
    const maxSize = isVideoFile ? 300 * 1024 * 1024 : 100 * 1024 * 1024
    const maxSizeText = isVideoFile ? '300MB' : '100MB'
    
    if (file.size > maxSize) {
      return NextResponse.json(
        { message: `ファイルサイズが大きすぎます（${maxSizeText}以下にしてください）` },
        { status: 400 }
      )
    }

    // ファイルタイプチェック（拡張子ベースで判定）
    const allowedExtensions = [
      // 画像ファイル
      'jpg', 'jpeg', 'png', 'gif', 'webp',
      // 動画ファイル
      'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv',
      // 文書ファイル
      'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip',
      // CADファイル
      'dwg', 'p21', 'sfc', 'bfo', 'step', 'stp', 'iges', 'igs'
    ]
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isAllowedExtension = allowedExtensions.includes(fileExtension || '')
    const isVideoFileByExtension = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv'].includes(fileExtension || '')
    
    if (!isAllowedExtension) {
      return NextResponse.json(
        { message: 'サポートされていないファイル形式です' },
        { status: 400 }
      )
    }

    // ファイルをSupabase Storageにアップロード
    const fileExt = file.name.split('.').pop()
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `chat-attachments/${roomId}/${fileName}`

    // アップロードオプション（MIMEタイプ制限を回避）
    const uploadOptions: any = {
      cacheControl: '3600',
      upsert: false,
      contentType: 'application/octet-stream' // 汎用的なMIMEタイプを使用
    }

    // 動画ファイルの場合はproject-attachmentsバケットを使用（より大きなサイズ制限）
    const bucketName = isVideoFile ? 'project-attachments' : 'attachments'
    
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(bucketName)
      .upload(filePath, file, uploadOptions)

    if (uploadError) {
      console.error('ファイルアップロードエラー:', uploadError)
      return NextResponse.json(
        { message: 'ファイルのアップロードに失敗しました: ' + uploadError.message },
        { status: 400 }
      )
    }

    // 公開URLを取得
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(bucketName)
      .getPublicUrl(filePath)

    // sender_typeを決定
    const senderType = membership?.org_id === project.org_id ? 'client' : 'contractor'

    // メッセージ内容を決定（コメントがある場合はコメント、ない場合はファイル名）
    const messageContent = comment.trim() ? comment : file.name

    // チャットメッセージを保存
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id: chatRoom.id,
        sender_id: userProfile.id,
        content: messageContent,
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size
      })
      .select()
      .single()

    if (messageError) {
      console.error('チャットメッセージ保存エラー:', messageError)
      return NextResponse.json(
        { message: 'メッセージの保存に失敗しました: ' + messageError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'ファイルがアップロードされました',
      file: {
        id: messageData.id,
        name: file.name,
        url: publicUrl,
        size: file.size,
        type: file.type.startsWith('image/') ? 'image' : 'file'
      }
    })

  } catch (error) {
    console.error('ファイルアップロードAPI エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
