import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Service roleでSupabaseクライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

// 仕様: 完了(= projects.status IN ('completed','archived','cancelled'))のプロジェクトに紐づくチャットで、
// 完了日(= projects.updated_at もしくは completed_at があればそれ)から14日過ぎたものを論理削除/物理削除

export async function POST(request: NextRequest) {
  try {
    // 認証: Cron専用トークン
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    // 14日前
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    // 完了プロジェクトを取得
    const { data: projects, error: projErr } = await supabaseAdmin
      .from('projects')
      .select('id, status, updated_at, completed_at')
      .in('status', ['completed', 'archived', 'cancelled'])
      .lte('updated_at', cutoff)

    if (projErr) {
      return NextResponse.json({ message: 'プロジェクト取得エラー' }, { status: 500 })
    }

    const projectIds = (projects || []).map(p => p.id)
    if (projectIds.length === 0) {
      return NextResponse.json({ message: '削除対象なし', deletedRooms: 0, deletedMessages: 0 })
    }

    // 対象チャットメッセージ削除
    const { error: delMsgErr } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .in('project_id', projectIds)

    if (delMsgErr) {
      return NextResponse.json({ message: 'メッセージ削除エラー' }, { status: 500 })
    }

    // ルーム情報ありの場合の後片付け（存在しない環境もあるため安全に）
    try {
      await supabaseAdmin
        .from('chat_rooms')
        .delete()
        .in('project_id', projectIds)
    } catch (_) {}

    return NextResponse.json({ message: 'チャット削除完了', projectCount: projectIds.length }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ message: 'サーバーエラー' }, { status: 500 })
  }
}









