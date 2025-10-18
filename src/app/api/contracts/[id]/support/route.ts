import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// 受注者が自身の契約でサポート利用を有効化/無効化する
// POST /api/contracts/:id/support  { enable: boolean }
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createSupabaseAdmin()
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })

    const { data: me } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (!me) return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 403 })

    const contractId = params.id
    const { data: contract, error: cErr } = await supabase
      .from('contracts')
      .select('id, contractor_id, project_id, contract_title')
      .eq('id', contractId)
      .single()

    if (cErr || !contract) {
      console.error('契約取得エラー:', {
        contractId,
        error: cErr,
        errorCode: cErr?.code,
        errorMessage: cErr?.message,
        errorDetails: cErr?.details
      })
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    if (contract.contractor_id !== me.id) {
      return NextResponse.json({ message: 'この契約を操作する権限がありません' }, { status: 403 })
    }

    // project_idがnullの場合のチェック
    if (!contract.project_id) {
      console.error('契約にproject_idが設定されていません:', { contractId, contract })
      return NextResponse.json({ message: '契約にプロジェクトが関連付けられていません' }, { status: 400 })
    }

    const { data: project, error: pErr } = await supabase
      .from('projects')
      .select('status')
      .eq('id', contract.project_id)
      .single()

    if (pErr || !project) {
      console.error('プロジェクト取得エラー:', { project_id: contract.project_id, error: pErr })
      return NextResponse.json({ message: 'プロジェクトが見つかりません' }, { status: 404 })
    }

    if (project.status === 'completed' || project.status === 'archived') {
      return NextResponse.json({ message: '案件完了後はサポートを変更できません' }, { status: 400 })
    }

    const body = await request.json()
    const enable = !!body?.enable

    const { error: uErr } = await supabase
      .from('contracts')
      .update({ support_enabled: enable })
      .eq('id', contractId)

    if (uErr) return NextResponse.json({ message: '更新に失敗しました' }, { status: 500 })

    // サポート有効化時：運営者をチャット参加者に追加
    if (enable && contract.project_id) {
      // チャットルームを取得または作成
      let { data: chatRoom } = await supabase
        .from('chat_rooms')
        .select('id')
        .eq('project_id', contract.project_id)
        .maybeSingle()

      if (!chatRoom) {
        // チャットルームが存在しない場合は作成
        const { data: newRoom, error: roomErr } = await supabase
          .from('chat_rooms')
          .insert({
            project_id: contract.project_id,
            name: contract.contract_title || 'プロジェクトチャット',
            is_active: true
          })
          .select('id')
          .single()

        if (roomErr) {
          console.error('チャットルーム作成エラー:', roomErr)
        } else {
          chatRoom = newRoom
        }
      }

      if (chatRoom) {
        // 運営者（Admin, Reviewer, Auditor）を取得
        const { data: supportMembers } = await supabase
          .from('users')
          .select(`
            auth_user_id,
            memberships!inner ( role )
          `)
          .in('memberships.role', ['Admin', 'Reviewer', 'Auditor'])

        if (supportMembers && supportMembers.length > 0) {
          // 既存の参加者を確認
          const { data: existingParticipants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('room_id', chatRoom.id)

          const existingUserIds = new Set(existingParticipants?.map(p => p.user_id) || [])

          // 新規参加者を追加
          const newParticipants = supportMembers
            .filter(member => member.auth_user_id && !existingUserIds.has(member.auth_user_id))
            .map(member => ({
              room_id: chatRoom.id,
              user_id: member.auth_user_id,
              role: 'member',
              is_active: true
            }))

          if (newParticipants.length > 0) {
            const { error: participantErr } = await supabase
              .from('chat_participants')
              .insert(newParticipants)

            if (participantErr) {
              console.error('運営者追加エラー:', participantErr)
            } else {
              console.log(`✅ ${newParticipants.length}人の運営者をチャットに追加しました`)
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, support_enabled: enable }, { status: 200 })
  } catch (error) {
    console.error('contract support toggle error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
























