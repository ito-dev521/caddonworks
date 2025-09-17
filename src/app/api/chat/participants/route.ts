import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

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

    const supabaseAdmin = createSupabaseAdmin()
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

    // このプロジェクトのチャットメッセージを送信したユーザーを取得
    const { data: messageSenders, error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .select(`
        sender_id,
        users:sender_id (
          id,
          display_name,
          email,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('is_deleted', false)

    if (messageError) {
      console.error('メッセージ送信者取得エラー:', messageError)
      return NextResponse.json(
        { message: 'チャット参加者の取得に失敗しました' },
        { status: 400 }
      )
    }

    // 重複を除去してユニークなユーザーリストを作成
    const uniqueUsers = new Map()
    
    // まず、すべてのユーザーの役割を一括取得
    const userIds = messageSenders?.map((item: any) => item.users?.id).filter(Boolean) || []
    
    if (userIds.length > 0) {
      const { data: allMemberships } = await supabaseAdmin
        .from('memberships')
        .select('user_id, role')
        .in('user_id', userIds)
        .eq('org_id', project.org_id)

      const membershipMap = new Map()
      allMemberships?.forEach((m: any) => {
        membershipMap.set(m.user_id, m.role)
      })

      messageSenders?.forEach((item: any) => {
        if (item.users && !uniqueUsers.has(item.users.id)) {
          // ユーザーの役割を判定
          let role = 'Member'
          if (membership?.org_id === project.org_id && item.users.id === userProfile.id) {
            role = membership.role
          } else if (project.contractor_id === item.users.id) {
            role = 'Contractor'
          } else {
            role = membershipMap.get(item.users.id) || 'Member'
          }

          uniqueUsers.set(item.users.id, {
            id: item.users.id,
            display_name: item.users.display_name || item.users.email,
            email: item.users.email,
            avatar_url: item.users.avatar_url,
            role: role
          })
        }
      })
    }

    const participants = Array.from(uniqueUsers.values())

    return NextResponse.json({
      participants
    }, { status: 200 })

  } catch (error) {
    console.error('チャット参加者取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}