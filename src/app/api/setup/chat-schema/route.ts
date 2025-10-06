import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// チャット関連テーブル(chat_rooms, chat_participants, chat_messages)を作成/補修する
export async function POST(request: NextRequest) {
  try {
    const supabaseAdmin = createSupabaseAdmin()

    const sql = `
      -- 1) chat_rooms
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        created_by UUID REFERENCES auth.users(id),
        is_active BOOLEAN DEFAULT true
      );

      -- 2) chat_participants
      CREATE TABLE IF NOT EXISTS chat_participants (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        role VARCHAR(50) DEFAULT 'member', -- 'owner','admin','member'
        joined_at TIMESTAMPTZ DEFAULT NOW(),
        last_read_at TIMESTAMPTZ DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true,
        UNIQUE(room_id, user_id)
      );

      -- 3) chat_messages
      CREATE TABLE IF NOT EXISTS chat_messages (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        message_type VARCHAR(50) DEFAULT 'text',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_project_id ON chat_rooms(project_id);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_room_id ON chat_participants(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at DESC);

      -- RLS
      ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;
      ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
      ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

      -- Policies (緩めに: 参加中のルーム閲覧を許可 / 送信は参加者のみ)
      DO $$ BEGIN
        CREATE POLICY "Users can view chat rooms they participate in" ON chat_rooms
          FOR SELECT USING (
            id IN (
              SELECT room_id FROM chat_participants
              WHERE user_id = auth.uid() AND is_active = true
            )
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Users can view participants in their chat rooms" ON chat_participants
          FOR SELECT USING (
            room_id IN (
              SELECT room_id FROM chat_participants
              WHERE user_id = auth.uid() AND is_active = true
            )
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;

      DO $$ BEGIN
        CREATE POLICY "Participants can send messages" ON chat_messages
          FOR INSERT WITH CHECK (
            room_id IN (
              SELECT room_id FROM chat_participants
              WHERE user_id = auth.uid() AND is_active = true
            )
          );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `

    // まず SQL を直接実行するために PostgREST の /rpc ではなく、
    // Supabase の SQL エディタ相当の queryを実行する関数がない環境があるため
    // フォールバック: ステップごとに個別に実行
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    for (const stmt of statements) {
      const { error } = await supabaseAdmin.from('_fake').select('*').limit(0) as any
      // 上の行は型合わせのためのダミー。実際の実行は pg 直接でないとできないため、
      // Supabase の JS クライアントでは個々のDDLは実行できない。
      // よって、ここではエラーを出して案内を返す。
      if (error) {
        break
      }
    }
    // JS クライアントではDDLが実行できないため、SQLの提示を返す
    return NextResponse.json({
      message: 'チャットスキーマ作成SQLを返します。Supabaseダッシュボードで実行してください。',
      sql
    })

    // このエンドポイントでは実行しない
  } catch (e: any) {
    return NextResponse.json({ message: 'サーバーエラー', error: e?.message || String(e) }, { status: 500 })
  }
}


