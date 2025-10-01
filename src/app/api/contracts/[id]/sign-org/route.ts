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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // Authorizationヘッダーからユーザー情報を取得
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
      .select('id, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 403 }
      )
    }

    // 発注者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships || memberships.length === 0) {
      return NextResponse.json(
        { message: '組織情報の取得に失敗しました' },
        { status: 403 }
      )
    }

    const orgMembership = memberships.find(m => m.role === 'OrgAdmin')
    if (!orgMembership) {
      return NextResponse.json(
        { message: 'この操作を実行する権限がありません（発注者権限が必要です）' },
        { status: 403 }
      )
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select('*')
      .eq('id', contractId)
      .eq('org_id', orgMembership.org_id)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { message: '契約が見つかりません' },
        { status: 404 }
      )
    }

    if (contract.status !== 'pending_org') {
      return NextResponse.json(
        { message: 'この契約は発注者側の署名待ちではありません' },
        { status: 400 }
      )
    }

    // 契約に署名（発注者側）
    const { data: updatedContract, error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        status: 'signed',
        org_signed_at: new Date().toISOString(),
        signed_at: new Date().toISOString()
      })
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      console.error('契約署名エラー:', updateError)
      return NextResponse.json(
        { message: '署名に失敗しました: ' + updateError.message },
        { status: 400 }
      )
    }

    // 案件のステータスを進行中に更新
    const { data: project } = await supabaseAdmin
      .from('projects')
      .update({
        status: 'in_progress'
      })
      .eq('id', contract.project_id)
      .select('id, title, assignee_name')
      .single()

    // チャットルーム作成と担当者自動招待
    if (project) {
      console.log('チャットルーム作成開始 - プロジェクトID:', project.id, 'プロジェクト名:', project.title)

      // チャットルームが既に存在するかチェック
      const { data: existingRoom } = await supabaseAdmin
        .from('chat_rooms')
        .select('id')
        .eq('project_id', project.id)
        .single()

      let chatRoomId = existingRoom?.id

      // チャットルームが存在しない場合は作成
      if (!chatRoomId) {
        const { data: newRoom, error: roomError } = await supabaseAdmin
          .from('chat_rooms')
          .insert({
            project_id: project.id,
            name: project.title,
            description: `${project.title}のチャットルーム`,
            created_by: user.id,
            is_active: true
          })
          .select('id')
          .single()

        if (roomError) {
          console.error('チャットルーム作成エラー:', roomError)
        } else if (newRoom) {
          chatRoomId = newRoom.id
          console.log('チャットルーム作成成功 - ルームID:', chatRoomId)

          // 案件担当者を自動招待（admin権限）
          if (project.assignee_name) {
            const { data: assignee } = await supabaseAdmin
              .from('users')
              .select('auth_user_id, display_name')
              .eq('display_name', project.assignee_name)
              .single()

            console.log('担当者検索結果:', assignee)

            if (assignee?.auth_user_id) {
              const { data: participantData, error: participantError } = await supabaseAdmin
                .from('chat_participants')
                .insert({
                  room_id: chatRoomId,
                  user_id: assignee.auth_user_id,
                  role: 'admin'
                })
                .select()

              if (participantError) {
                console.error('担当者の参加者追加エラー:', participantError)
              } else {
                console.log('担当者の参加者追加成功:', participantData)
              }
            }
          }

          // 受注者を自動招待（member権限）
          if (contract.contractor_id) {
            const { data: contractor } = await supabaseAdmin
              .from('users')
              .select('auth_user_id, display_name')
              .eq('id', contract.contractor_id)
              .single()

            console.log('受注者検索結果:', contractor)

            if (contractor?.auth_user_id) {
              const { data: participantData, error: participantError } = await supabaseAdmin
                .from('chat_participants')
                .insert({
                  room_id: chatRoomId,
                  user_id: contractor.auth_user_id,
                  role: 'member'
                })
                .select()

              if (participantError) {
                console.error('受注者の参加者追加エラー:', participantError)
              } else {
                console.log('受注者の参加者追加成功:', participantData)
              }
            }
          }
        }
      } else {
        console.log('チャットルームは既に存在します - ルームID:', chatRoomId)
      }
    }

    // 受注者に署名完了通知を送信
    const { data: contractorUser, error: contractorUserError } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .eq('id', contract.contractor_id)
      .single()

    if (!contractorUserError && contractorUser) {
      await supabaseAdmin.from('notifications').insert({
        user_id: contractorUser.id,
        type: 'contract_signed',
        title: '契約が署名完了しました',
        message: `案件「${contract.contract_title}」の契約が発注者によって署名されました。業務を開始できます。`,
        data: {
          project_id: contract.project_id,
          contract_id: contract.id,
          org_id: contract.org_id
        }
      })
    }

    return NextResponse.json({
      message: '契約に署名しました',
      contract: updatedContract
    }, { status: 200 })

  } catch (error) {
    console.error('契約署名エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
