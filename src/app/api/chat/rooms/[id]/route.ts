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

// 特定のチャットルーム情報を取得
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const roomId = params.id

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

    // チャットルームを取得
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select('id, project_id, name, description')
      .eq('id', roomId)
      .single()

    if (roomError || !chatRoom) {
      return NextResponse.json(
        { message: 'チャットルームが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: chatRoom.id,
      project_id: chatRoom.project_id,
      name: chatRoom.name,
      description: chatRoom.description
    }, { status: 200 })

  } catch (error) {
    console.error('チャットルーム取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
