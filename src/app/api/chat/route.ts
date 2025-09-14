import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, message, sender_type } = body

    // バリデーション
    if (!project_id || !message || !sender_type) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        org_id,
        contractor_id,
        memberships!inner (
          user_id,
          role
        )
      `)
      .eq('id', project_id)
      .eq('memberships.user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つからないか、アクセス権限がありません' },
        { status: 403 }
      )
    }

    // チャットメッセージを保存
    const { data: messageData, error: messageError } = await supabase
      .from('chat_messages')
      .insert({
        project_id,
        sender_id: user.id,
        sender_type, // 'client' or 'contractor'
        message,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (messageError) {
      console.error('メッセージ保存エラー:', messageError)
      return NextResponse.json(
        { message: 'メッセージの保存に失敗しました' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: 'メッセージが送信されました',
      chat_message: messageData
    }, { status: 201 })

  } catch (error) {
    console.error('チャット送信エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json(
        { message: '案件IDが必要です' },
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        title,
        org_id,
        contractor_id,
        memberships!inner (
          user_id,
          role
        )
      `)
      .eq('id', project_id)
      .eq('memberships.user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つからないか、アクセス権限がありません' },
        { status: 403 }
      )
    }

    // チャットメッセージを取得
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        message,
        sender_type,
        created_at,
        users!chat_messages_sender_id_fkey (
          display_name,
          email
        )
      `)
      .eq('project_id', project_id)
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
      message: msg.message,
      sender_type: msg.sender_type,
      sender_name: (msg.users as any)?.display_name || 'Unknown',
      created_at: msg.created_at
    })) || []

    return NextResponse.json({
      messages: formattedMessages
    }, { status: 200 })

  } catch (error) {
    console.error('チャット取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
