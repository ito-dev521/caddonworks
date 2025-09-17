import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createSupabaseAdmin } from '@/lib/supabase'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// 特定のメッセージを取得
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 認証チェック
    const { data: { session }, error: authError } = await supabase.auth.getSession()
    if (authError || !session) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('message_id')

    if (!messageId) {
      return NextResponse.json({ message: 'メッセージIDが必要です' }, { status: 400 })
    }

    // メッセージを取得
    const { data: message, error: messageError } = await supabase
      .from('chat_messages')
      .select(`
        id,
        content,
        message_type,
        file_url,
        file_name,
        file_size,
        created_at,
        updated_at,
        edited_at,
        is_deleted,
        sender_id,
        users!inner (
          id,
          display_name,
          avatar_url
        )
      `)
      .eq('id', messageId)
      .eq('is_deleted', false)
      .single()

    if (messageError) {
      console.error('メッセージ取得エラー:', messageError)
      return NextResponse.json({ message: 'メッセージの取得に失敗しました' }, { status: 500 })
    }

    if (!message) {
      return NextResponse.json({ message: 'メッセージが見つかりません' }, { status: 404 })
    }

    // レスポンス形式を整形
    const formattedMessage = {
      id: message.id,
      content: message.content,
      message_type: message.message_type,
      file_url: message.file_url,
      file_name: message.file_name,
      file_size: message.file_size,
      created_at: message.created_at,
      updated_at: message.updated_at,
      edited_at: message.edited_at,
      is_deleted: message.is_deleted,
      sender: {
        id: (message.users as any)?.id,
        display_name: (message.users as any)?.display_name,
        avatar_url: (message.users as any)?.avatar_url
      }
    }

    return NextResponse.json({
      message: formattedMessage
    }, { status: 200 })

  } catch (error) {
    console.error('メッセージ取得エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
