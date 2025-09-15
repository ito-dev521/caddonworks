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

// chat_participantsテーブルに参加者を追加する招待API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { room_id, user_emails } = body

    // バリデーション
    if (!room_id || !user_emails || !Array.isArray(user_emails)) {
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

    // 招待権限をチェック（発注者側の組織メンバーのみ）
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    const canInvite = membership?.org_id === project.org_id

    if (!canInvite) {
      return NextResponse.json(
        { message: 'この操作を行う権限がありません（発注者側のメンバーのみ招待可能）' },
        { status: 403 }
      )
    }

    // チャットルームが存在するかチェック（なければ作成）
    let { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (roomError || !chatRoom) {
      // チャットルームを作成
      const { data: newRoom, error: createRoomError } = await supabaseAdmin
        .from('chat_rooms')
        .insert({
          project_id: projectId,
          name: project.title,
          description: `${project.title}のチャットルーム`,
          created_by: userProfile.id
        })
        .select('id')
        .single()

      if (createRoomError) {
        return NextResponse.json(
          { message: 'チャットルームの作成に失敗しました' },
          { status: 400 }
        )
      }
      chatRoom = newRoom
    }

    // 招待するユーザーを検索
    const { data: inviteUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .in('email', user_emails)

    if (usersError) {
      return NextResponse.json(
        { message: 'ユーザー検索に失敗しました' },
        { status: 400 }
      )
    }

    const foundEmails = inviteUsers?.map(u => u.email) || []
    const notFoundEmails = user_emails.filter(email => !foundEmails.includes(email))

    // 招待するユーザーをchat_participantsテーブルに追加
    const inviteResults = []
    for (const inviteUser of inviteUsers || []) {
      try {
        // 既に参加しているかチェック
        const { data: existingParticipant } = await supabaseAdmin
          .from('chat_participants')
          .select('id')
          .eq('room_id', chatRoom.id)
          .eq('user_id', inviteUser.id)
          .single()

        if (!existingParticipant) {
          // chat_participantsに追加
          const { error: participantError } = await supabaseAdmin
            .from('chat_participants')
            .insert({
              room_id: chatRoom.id,
              user_id: inviteUser.id,
              role: 'member'
            })

          if (participantError) {
            console.error('参加者追加エラー:', participantError)
            inviteResults.push({
              email: inviteUser.email,
              success: false,
              error: '参加者の追加に失敗しました'
            })
          } else {
            inviteResults.push({
              email: inviteUser.email,
              success: true,
              message: 'チャットルームに招待されました'
            })
          }
        } else {
          inviteResults.push({
            email: inviteUser.email,
            success: true,
            message: '既にチャットルームに参加しています'
          })
        }
      } catch (error) {
        console.error('招待処理エラー:', error)
        inviteResults.push({
          email: inviteUser.email,
          success: false,
          error: '招待処理中にエラーが発生しました'
        })
      }
    }

    // 見つからなかったメールアドレス
    for (const email of notFoundEmails) {
      inviteResults.push({
        email,
        success: false,
        error: 'ユーザーが見つかりません'
      })
    }

    return NextResponse.json({
      message: '招待処理が完了しました',
      results: inviteResults
    }, { status: 200 })

  } catch (error) {
    console.error('参加者招待エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}