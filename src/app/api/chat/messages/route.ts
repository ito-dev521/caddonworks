import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service roleキーでSupabaseクライアントを作成（RLSをバイパス）
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

// チャットメッセージを取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const roomId = searchParams.get('room_id')

    if (!roomId) {
      return NextResponse.json(
        { message: 'ルームIDが必要です' },
        { status: 400 }
      )
    }

    // ルームIDからプロジェクトIDを抽出
    const projectId = roomId.replace('project_', '')

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

    // プロジェクトの存在確認
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

    // チャットメッセージを取得
    const { data: messages, error: messagesError } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        id,
        message,
        sender_type,
        message_type,
        file_url,
        file_name,
        file_size,
        created_at,
        updated_at,
        users:sender_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (messagesError) {
      console.error('メッセージ取得エラー:', messagesError)
      return NextResponse.json(
        { message: 'メッセージの取得に失敗しました' },
        { status: 400 }
      )
    }

    const formattedMessages = messages?.map(msg => ({
      id: msg.id,
      room_id: roomId,
      content: msg.message,
      sender_id: (msg.users as any)?.id,
      sender_name: (msg.users as any)?.display_name || 'Unknown',
      sender_email: (msg.users as any)?.email,
      sender_avatar_url: (msg.users as any)?.avatar_url,
      sender_type: msg.sender_type,
      created_at: msg.created_at,
      is_deleted: false,
      message_type: msg.message_type || 'text',
      file_url: msg.file_url,
      file_name: msg.file_name,
      file_size: msg.file_size
    })) || []

    return NextResponse.json({
      messages: formattedMessages
    }, { status: 200 })

  } catch (error) {
    console.error('チャットメッセージ取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 新しいチャットメッセージを送信
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, content, message_type = 'text' } = body

    // バリデーション
    if (!room_id || !content) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // ルームIDからプロジェクトIDを抽出
    const projectId = room_id.replace('project_', '')

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

    // プロジェクトの存在確認
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

    // sender_typeを決定（組織メンバーは'client'、受注者は'contractor'）
    const senderType = membership?.org_id === project.org_id ? 'client' : 'contractor'

    // チャットメッセージを保存
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        project_id: projectId,
        sender_id: userProfile.id,
        sender_type: senderType,
        message: content,
        created_at: new Date().toISOString()
      })
      .select(`
        id,
        message,
        sender_type,
        created_at,
        users:sender_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .single()

    if (messageError) {
      console.error('メッセージ保存エラー:', messageError)
      return NextResponse.json(
        { message: 'メッセージの保存に失敗しました' },
        { status: 400 }
      )
    }

    const formattedMessage = {
      id: messageData.id,
      room_id,
      content: messageData.message,
      sender_id: (messageData.users as any)?.id,
      sender_name: (messageData.users as any)?.display_name || 'Unknown',
      sender_email: (messageData.users as any)?.email,
      sender_avatar_url: (messageData.users as any)?.avatar_url,
      sender_type: messageData.sender_type,
      created_at: messageData.created_at,
      is_deleted: false,
      message_type
    }

    return NextResponse.json({
      message: 'メッセージが送信されました',
      chat_message: formattedMessage
    }, { status: 201 })

  } catch (error) {
    console.error('チャットメッセージ送信エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}