import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()
    const results = []

    // 1. chat_roomsテーブルを作成
    try {
      const { error: chatRoomsError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS chat_rooms (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            project_id UUID,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID,
            is_active BOOLEAN DEFAULT true
          );
        `
      })

      if (chatRoomsError) {
        results.push({ table: 'chat_rooms', status: 'error', message: chatRoomsError.message })
      } else {
        results.push({ table: 'chat_rooms', status: 'success', message: 'テーブルを作成しました' })
      }
    } catch (err) {
      results.push({ table: 'chat_rooms', status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }

    // 2. usersテーブルを作成
    try {
      const { error: usersError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            auth_user_id UUID UNIQUE,
            email VARCHAR(255) UNIQUE NOT NULL,
            display_name VARCHAR(255),
            avatar_url TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })

      if (usersError) {
        results.push({ table: 'users', status: 'error', message: usersError.message })
      } else {
        results.push({ table: 'users', status: 'success', message: 'テーブルを作成しました' })
      }
    } catch (err) {
      results.push({ table: 'users', status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }

    // 3. chat_messagesテーブルを作成
    try {
      const { error: chatMessagesError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
            sender_id UUID,
            content TEXT NOT NULL,
            message_type VARCHAR(50) DEFAULT 'text',
            file_url TEXT,
            file_name TEXT,
            file_size INTEGER,
            reply_to UUID REFERENCES chat_messages(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_deleted BOOLEAN DEFAULT false,
            edited_at TIMESTAMP WITH TIME ZONE
          );
        `
      })

      if (chatMessagesError) {
        results.push({ table: 'chat_messages', status: 'error', message: chatMessagesError.message })
      } else {
        results.push({ table: 'chat_messages', status: 'success', message: 'テーブルを作成しました' })
      }
    } catch (err) {
      results.push({ table: 'chat_messages', status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }

    // 4. message_reactionsテーブルを作成
    try {
      const { error: reactionsError } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS message_reactions (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            reaction_type VARCHAR(10) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(message_id, user_id, reaction_type)
          );
        `
      })

      if (reactionsError) {
        results.push({ table: 'message_reactions', status: 'error', message: reactionsError.message })
      } else {
        results.push({ table: 'message_reactions', status: 'success', message: 'テーブルを作成しました' })
      }
    } catch (err) {
      results.push({ table: 'message_reactions', status: 'error', message: err instanceof Error ? err.message : 'Unknown error' })
    }

    return NextResponse.json({
      message: 'テーブルセットアップが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('テーブルセットアップエラー:', error)
    return NextResponse.json(
      { 
        message: 'サーバーエラーが発生しました',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
