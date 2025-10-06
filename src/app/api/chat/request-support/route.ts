import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

// チャットでサポートを要請した時に適切な監査員を自動参加させる
export async function POST(request: NextRequest) {
  try {
    const { room_id, user_id, message } = await request.json()

    if (!room_id || !user_id) {
      return NextResponse.json(
        { message: '必須項目が入力されていません' },
        { status: 400 }
      )
    }

    // サポート要請者の情報を取得
    const { data: requester, error: requesterError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        display_name,
        email,
        memberships (
          role,
          org_id
        )
      `)
      .eq('id', user_id)
      .single()

    if (requesterError || !requester) {
      return NextResponse.json(
        { message: 'サポート要請者が見つかりません' },
        { status: 404 }
      )
    }

    // チャットルームからプロジェクト情報を取得
    const { data: chatRoom, error: roomError } = await supabaseAdmin
      .from('chat_rooms')
      .select(`
        id,
        project_id,
        projects!inner (
          id,
          title,
          member_level,
          org_id,
          contractor_id
        )
      `)
      .eq('id', room_id)
      .single()

    if (roomError || !chatRoom) {
      return NextResponse.json(
        { message: 'チャットルームが見つかりません' },
        { status: 404 }
      )
    }

    const project = chatRoom.projects
    const projectLevel = (project as any)?.member_level || 'beginner'

    // サポート要請者の種別を判定
    const isContractor = (project as any)?.contractor_id === user_id
    const isClient = requester.memberships?.some(m => m.org_id === (project as any)?.org_id)
    const requesterType = isContractor ? '受注者' : isClient ? '発注者' : '不明'

    // 既に監査員が参加しているかチェック
    const { data: existingAuditor } = await supabaseAdmin
      .from('chat_participants')
      .select(`
        id,
        users!inner (
          id,
          display_name,
          memberships!inner (
            role
          )
        )
      `)
      .eq('room_id', room_id)
      .eq('users.memberships.role', 'Auditor')
      .single()

    if (existingAuditor) {
      return NextResponse.json(
        {
          message: '監査員は既にチャットに参加しています',
          auditor: (existingAuditor.users as any)?.display_name
        },
        { status: 200 }
      )
    }

    // 適切なレベルの監査員を取得
    const levelHierarchy = ['beginner', 'intermediate', 'advanced', 'expert']
    const projectLevelIndex = levelHierarchy.indexOf(projectLevel)
    const eligibleLevels = levelHierarchy.slice(projectLevelIndex)

    const { data: auditors, error: auditorsError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        auth_user_id,
        display_name,
        email,
        member_level,
        memberships!inner (
          role
        )
      `)
      .in('member_level', eligibleLevels)
      .eq('memberships.role', 'Auditor')

    if (auditorsError || !auditors || auditors.length === 0) {
      return NextResponse.json(
        { message: '適切なレベルの監査員が見つかりません' },
        { status: 404 }
      )
    }

    // ランダムに1名選択
    const selectedAuditor = auditors[Math.floor(Math.random() * auditors.length)]

    // 監査員をチャットに参加させる
    const { error: participantError } = await supabaseAdmin
      .from('chat_participants')
      .insert({
        room_id: room_id,
        // chat_participants.user_id は auth.users.id を参照
        user_id: selectedAuditor.auth_user_id,
        role: 'auditor'
      })

    if (participantError) {
      console.error('監査員参加エラー:', participantError)
      return NextResponse.json(
        { message: '監査員の参加に失敗しました' },
        { status: 500 }
      )
    }

    // サポート要請メッセージを送信
    const { error: supportMessageError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id: room_id,
        // chat_messages.sender_id を使うスキーマも存在するため互換対応
        sender_id: requester.auth_user_id,
        content: message || `${requesterType}からサポートを要請します`,
        message_type: 'support_request'
      })

    if (supportMessageError) {
      console.error('サポートメッセージ送信エラー:', supportMessageError)
    }

    // 監査員参加の通知メッセージを送信
    const { error: notificationError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        room_id: room_id,
        sender_id: selectedAuditor.auth_user_id,
        content: `${requesterType}からのサポート要請により監査員として参加しました（対応レベル: ${selectedAuditor.member_level}）`,
        message_type: 'system'
      })

    if (notificationError) {
      console.error('通知メッセージ送信エラー:', notificationError)
    }

    return NextResponse.json({
      message: `${requesterType}からのサポート要請により監査員が参加しました`,
      requester: {
        type: requesterType,
        name: requester.display_name
      },
      auditor: {
        name: selectedAuditor.display_name,
        email: selectedAuditor.email,
        level: selectedAuditor.member_level
      }
    }, { status: 200 })

  } catch (error) {
    console.error('サポート要請エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}