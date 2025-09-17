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

    // 署名済み契約のプロジェクトのみを取得
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from('contracts')
      .select(`
        project_id,
        status,
        projects (
          id,
          title,
          description,
          status,
          org_id,
          contractor_id,
          organizations (
            name
          )
        )
      `)
      .eq('status', 'signed')

    if (contractsError) {
      console.error('契約取得エラー:', contractsError)
      return NextResponse.json(
        { message: '契約の取得に失敗しました' },
        { status: 400 }
      )
    }

    // ユーザーの組織メンバーシップを確認
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', userProfile.id)
      .single()

    // ユーザーがアクセス可能な署名済み契約のプロジェクトをフィルタリング
    const accessibleProjects = contracts?.filter(contract => {
      const project = contract.projects as any
      console.log('chat-rooms API: プロジェクトフィルタリング', {
        project_id: project?.id,
        project_title: project?.title,
        org_id: project?.org_id,
        contractor_id: project?.contractor_id,
        user_id: userProfile.id,
        membership_org_id: membership?.org_id,
        membership_role: membership?.role
      })
      return project && (
        membership?.org_id === project.org_id || 
        project.contractor_id === userProfile.id
      )
    }).map(contract => contract.projects as any) || []

    // プロジェクトIDで重複を除去（同じプロジェクトの複数契約を統合）
    const uniqueProjects = accessibleProjects.reduce((acc, project) => {
      if (!acc.find((p: any) => p.id === project.id)) {
        acc.push(project)
      }
      return acc
    }, [] as any[])

    // 各プロジェクトのチャットルーム情報を構築
    const chatRooms = await Promise.all(
      uniqueProjects.map(async (project: any) => {
        // 最新メッセージを取得
        const { data: lastMessage } = await supabaseAdmin
          .from('chat_messages')
          .select(`
            message,
            created_at,
            users:sender_id (
              display_name,
              email
            )
          `)
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        // 未読メッセージ数を計算
        const unreadCount = 0 // TODO: 実装

        // プロジェクトの参加者数を計算（発注者 + 受注者）
        const participantCount = 2 // 基本的に発注者と受注者

        return {
          id: `project_${project.id}`,
          name: project.title,
          description: project.description,
          project_id: project.id,
          project_name: project.title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: project.status === 'in_progress',
          participant_count: participantCount,
          unread_count: unreadCount,
          last_message: lastMessage ? {
            content: lastMessage.message,
            sender_name: (lastMessage.users as any)?.display_name || 'Unknown',
            created_at: lastMessage.created_at
          } : null
        }
      })
    )

    return NextResponse.json({
      rooms: chatRooms
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