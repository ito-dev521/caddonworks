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

    // 案件の存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, contractor_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーの組織メンバーシップを確認
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    // 複数受注者対応：プロジェクト参加者としてのアクセス権限をチェック
    const { data: projectParticipant } = await supabaseAdmin
      .from('project_participants')
      .select('id, role, status')
      .eq('project_id', project_id)
      .eq('user_id', userProfile.id)
      .single()

    // アクセス権限をチェック（組織のメンバー、単一受注者、または複数受注者の参加者）
    const hasAccess = membership?.org_id === project.org_id || 
                     project.contractor_id === userProfile.id || 
                     (projectParticipant && projectParticipant.status === 'active')

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'この案件へのアクセス権限がありません' },
        { status: 403 }
      )
    }

    // チャットメッセージを保存
    const { data: messageData, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        project_id,
        sender_id: userProfile.id,
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

    // 案件の存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, contractor_id')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: '案件が見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーの組織メンバーシップを確認
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    // 複数受注者対応：プロジェクト参加者としてのアクセス権限をチェック
    const { data: projectParticipant } = await supabaseAdmin
      .from('project_participants')
      .select('id, role, status')
      .eq('project_id', project_id)
      .eq('user_id', userProfile.id)
      .single()

    // アクセス権限をチェック（組織のメンバー、単一受注者、または複数受注者の参加者）
    const hasAccess = membership?.org_id === project.org_id || 
                     project.contractor_id === userProfile.id || 
                     (projectParticipant && projectParticipant.status === 'active')

    if (!hasAccess) {
      return NextResponse.json(
        { message: 'この案件へのアクセス権限がありません' },
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
