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

// チャットルーム参加者一覧を取得
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

    // chat_participantsテーブルから実際の参加者を取得
    const participants = []

    // まず、chat_roomsテーブルでチャットルームが存在するかチェック
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id')
      .eq('project_id', projectId)
      .single()

    if (roomError || !chatRoom) {
      // チャットルームが存在しない場合は、デフォルトで受注者のみを表示
      if (project.contractor_id) {
        const { data: contractor } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .eq('id', project.contractor_id)
          .single()

        if (contractor) {
          participants.push({
            id: contractor.id,
            email: contractor.email,
            display_name: contractor.display_name,
            role: 'contractor',
            org_role: null,
            joined_at: new Date().toISOString(),
            is_active: true
          })
        }
      }
    } else {
      // chat_participantsテーブルから実際の参加者を取得
      const { data: chatParticipants } = await supabaseAdmin
        .from('chat_participants')
        .select(`
          user_id,
          role,
          joined_at,
          is_active,
          users:user_id (
            id,
            display_name,
            email
          )
        `)
        .eq('room_id', chatRoom.id)
        .eq('is_active', true)

      if (chatParticipants) {
        // 各参加者の組織情報を取得して発注者側か受注者かを判定
        for (const participant of chatParticipants) {
          const isContractor = participant.user_id === project.contractor_id
          let orgRole = null

          if (!isContractor) {
            // 発注者側の場合は組織ロールを取得
            const { data: membershipInfo } = await supabaseAdmin
              .from('memberships')
              .select('role')
              .eq('user_id', participant.user_id)
              .eq('org_id', project.org_id)
              .single()

            orgRole = membershipInfo?.role
          }

          participants.push({
            id: (participant.users as any).id,
            email: (participant.users as any).email,
            display_name: (participant.users as any).display_name,
            role: isContractor ? 'contractor' : 'client',
            org_role: orgRole,
            joined_at: participant.joined_at,
            is_active: participant.is_active
          })
        }
      }

      // 受注者が参加者テーブルにいない場合は追加
      if (project.contractor_id) {
        const contractorExists = participants.some(p => p.id === project.contractor_id)
        if (!contractorExists) {
          const { data: contractor } = await supabaseAdmin
            .from('users')
            .select('id, display_name, email')
            .eq('id', project.contractor_id)
            .single()

          if (contractor) {
            participants.push({
              id: contractor.id,
              email: contractor.email,
              display_name: contractor.display_name,
              role: 'contractor',
              org_role: null,
              joined_at: new Date().toISOString(),
              is_active: true
            })
          }
        }
      }
    }

    return NextResponse.json({
      participants
    }, { status: 200 })

  } catch (error) {
    console.error('参加者取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

