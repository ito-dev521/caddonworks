import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

// チャットルーム一覧を取得
export async function GET(request: NextRequest) {
  try {
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

    // デバッグ用：ユーザー情報を確認
    console.log('チャット一覧取得 - ユーザーID:', user.id, 'Email:', user.email, 'Profile ID:', userProfile.id)

    // chat_participantsテーブルから参加しているチャットルームを取得
    // 注意: chat_participants.user_idにはusers.auth_user_idが格納されている
    const { data: participantRooms, error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .select(`
        room_id,
        role,
        joined_at,
        user_id,
        chat_rooms!inner (
          id,
          project_id,
          name,
          description,
          created_at,
          updated_at,
          is_active,
          projects!inner (
            id,
            title,
            description,
            status,
            org_id,
            contractor_id,
            created_at,
            organizations (
              name
            )
          )
        )
      `)
      .eq('user_id', user.id) // user.idはauth_user_idと同じ

    console.log('参加ルーム取得結果:', {
      count: participantRooms?.length || 0,
      error: participantError,
      rooms: participantRooms,
      firstRoom: participantRooms?.[0]
    })

    // デバッグ：全てのchat_participantsを確認
    const { data: allParticipants } = await supabaseAdmin
      .from('chat_participants')
      .select('id, room_id, user_id, is_active')
      .eq('user_id', user.id)

    console.log('全chat_participants (user_id=' + user.id + '):', allParticipants)

    if (participantError) {
      console.error('参加ルーム取得エラー:', participantError)
      return NextResponse.json(
        { message: 'チャットルームの取得に失敗しました', error: participantError.message },
        { status: 400 }
      )
    }

    // チャットルーム情報を構築
    const chatRooms = await Promise.all(
      (participantRooms || []).map(async (participant: any) => {
        const room = participant.chat_rooms
        const project = room.projects

        // 最新メッセージを取得
        const { data: lastMessage } = await supabaseAdmin
          .from('chat_messages')
          .select(`
            content,
            created_at,
            sender_id,
            users (
              display_name,
              email
            )
          `)
          .eq('room_id', room.id)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 未読メッセージ数を計算
        const unreadCount = 0 // TODO: 実装

        // チャット参加者数を取得
        const { data: roomParticipants } = await supabaseAdmin
          .from('chat_participants')
          .select('id')
          .eq('room_id', room.id)
          .eq('is_active', true)

        const participantCount = roomParticipants?.length || 0

        return {
          id: room.id,
          name: room.name || project.title,
          description: room.description || project.description,
          project_id: project.id,
          project_name: project.title,
          project_status: project.status,
          created_at: room.created_at || new Date().toISOString(),
          updated_at: lastMessage?.created_at || room.updated_at || new Date().toISOString(),
          is_active: room.is_active && project.status === 'in_progress',
          participant_count: participantCount,
          unread_count: unreadCount,
          last_message: lastMessage ? {
            content: lastMessage.content,
            sender_name: (lastMessage.users as any)?.display_name || 'Unknown',
            created_at: lastMessage.created_at
          } : null
        }
      })
    )

    // 並び順: 完了は常に最後 → 最新コメント時刻の降順（新しい順）
    const sortedChatRooms = chatRooms.sort((a: any, b: any) => {
      // 1) 完了を常に最後へ
      const aCompleted = a.project_status === 'completed'
      const bCompleted = b.project_status === 'completed'
      if (aCompleted !== bCompleted) return aCompleted ? 1 : -1

      // 2) updated_at（最新コメント時刻）で降順ソート（新しいものが上）
      const aTime = new Date(a.updated_at).getTime()
      const bTime = new Date(b.updated_at).getTime()
      return bTime - aTime
    })

    return NextResponse.json({
      rooms: sortedChatRooms
    }, { status: 200 })

  } catch (error) {
    console.error('チャットルーム取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 新しいチャットルームを作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { project_id, name, description } = body

    // バリデーション
    if (!project_id || !name) {
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

    // プロジェクトの存在確認
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, contractor_id')
      .eq('id', project_id)
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

    return NextResponse.json({
      message: 'チャットルームが作成されました',
      room: {
        id: `project_${project.id}`,
        name,
        description,
        project_id,
        created_at: new Date().toISOString()
      }
    }, { status: 201 })

  } catch (error) {
    console.error('チャットルーム作成エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}