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

// 案件レベルに応じて適切な監査員をチャットに自動参加させる
export async function POST(request: NextRequest) {
  try {
    const { project_id, room_id } = await request.json()

    if (!project_id || !room_id) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, title, member_level')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { message: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    // 案件のレベルを取得（デフォルトは初級）
    const projectLevel = project.member_level || 'beginner'

    // 同じレベルまたはそれ以上のレベルの監査員を取得
    const levelHierarchy = ['beginner', 'intermediate', 'advanced', 'expert']
    const projectLevelIndex = levelHierarchy.indexOf(projectLevel)
    const eligibleLevels = levelHierarchy.slice(projectLevelIndex)

    // 監査員（Auditor）で適切なレベルのユーザーを取得
    const { data: auditors, error: auditorsError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        display_name,
        email,
        member_level,
        memberships!inner (
          role,
          organizations!inner (
            name
          )
        )
      `)
      .in('member_level', eligibleLevels)
      .eq('memberships.role', 'Auditor')

    if (auditorsError) {
      console.error('監査員取得エラー:', auditorsError)
      return NextResponse.json(
        { message: '監査員の取得に失敗しました' },
        { status: 500 }
      )
    }

    if (!auditors || auditors.length === 0) {
      return NextResponse.json(
        { message: '適切なレベルの監査員が見つかりません' },
        { status: 404 }
      )
    }

    // ランダムに1名選択
    const selectedAuditor = auditors[Math.floor(Math.random() * auditors.length)]

    // 既にチャットに参加しているかチェック
    const { data: existingParticipant } = await supabaseAdmin
      .from('chat_participants')
      .select('id')
      .eq('room_id', room_id)
      .eq('user_id', selectedAuditor.id)
      .single()

    if (existingParticipant) {
      return NextResponse.json(
        {
          message: '監査員は既にチャットに参加しています',
          auditor: {
            name: selectedAuditor.display_name,
            email: selectedAuditor.email,
            level: selectedAuditor.member_level
          }
        },
        { status: 200 }
      )
    }

    // 監査員をチャットに参加させる
    const { error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .insert({
        room_id: room_id,
        user_id: selectedAuditor.id,
        role: 'auditor'
      })

    if (participantError) {
      console.error('監査員参加エラー:', participantError)
      return NextResponse.json(
        { message: '監査員の参加に失敗しました' },
        { status: 500 }
      )
    }

    // システムメッセージを送信
    const { error: messageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id: room_id,
        user_id: selectedAuditor.id,
        content: `監査員として参加しました。案件レベル: ${projectLevel}`,
        message_type: 'system'
      })

    if (messageError) {
      console.error('システムメッセージ送信エラー:', messageError)
    }

    return NextResponse.json({
      message: '監査員が自動的にチャットに参加しました',
      auditor: {
        name: selectedAuditor.display_name,
        email: selectedAuditor.email,
        level: selectedAuditor.member_level
      }
    }, { status: 200 })

  } catch (error) {
    console.error('監査員自動参加エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}