import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { boxSignAPI } from '@/lib/box-sign'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Webhook からの呼び出し（サービスロールキー）をチェック
    const isWebhookCall = token === process.env.SUPABASE_SERVICE_ROLE_KEY

    let user: any = null

    if (!isWebhookCall) {
      // 通常のユーザー認証
      const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token)

      if (authError || !userData.user) {
        return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
      }

      user = userData.user
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabaseAdmin
      .from('contracts')
      .select(`
        id,
        contractor_id,
        order_acceptance_sign_request_id,
        order_acceptance_signed_at,
        order_acceptance_box_id,
        projects!inner(
          id,
          title,
          box_folder_id,
          created_by,
          org_id
        )
      `)
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ message: '契約が見つかりません' }, { status: 404 })
    }

    // 署名リクエストIDが存在するかチェック
    if (!contract.order_acceptance_sign_request_id) {
      return NextResponse.json({ message: '署名リクエストが見つかりません' }, { status: 404 })
    }

    // 既に署名完了している場合
    if (contract.order_acceptance_signed_at) {
      return NextResponse.json({
        message: '既に署名完了処理が完了しています',
        signedAt: contract.order_acceptance_signed_at
      }, { status: 200 })
    }

    // Box Signステータスを確認
    const signatureStatus = await boxSignAPI.getSignatureStatus(contract.order_acceptance_sign_request_id)

    if (!signatureStatus) {
      return NextResponse.json({ message: '署名ステータスの取得に失敗しました' }, { status: 500 })
    }

    // 署名が完了しているかチェック
    if (signatureStatus.status !== 'signed') {
      return NextResponse.json({
        message: `署名はまだ完了していません（現在のステータス: ${signatureStatus.status}）`,
        status: signatureStatus.status,
        signers: signatureStatus.signers
      }, { status: 200 })
    }

    // 署名済みファイルIDを取得
    const signedFileId = signatureStatus.signFiles?.files?.[0]?.id

    const project = contract.projects

    // データベースを更新
    const signedAt = new Date().toISOString()
    const { error: updateError } = await supabaseAdmin
      .from('contracts')
      .update({
        order_acceptance_signed_at: signedAt,
        order_acceptance_signed_box_id: signedFileId || null
      })
      .eq('id', contractId)

    if (updateError) {
      console.error('❌ データベース更新エラー:', updateError)
      return NextResponse.json({ message: 'データベースの更新に失敗しました' }, { status: 500 })
    }

    // プロジェクトのステータスを進行中に更新
    await supabaseAdmin
      .from('projects')
      .update({ status: 'in_progress' })
      .eq('id', project.id)

    // チャットルームを作成
    const { data: existingRoom } = await supabaseAdmin
      .from('chat_rooms')
      .select('id')
      .eq('project_id', project.id)
      .single()

    if (!existingRoom) {
      // チャットルーム作成者を決定（Webhook の場合はプロジェクト作成者）
      const { data: creatorUser } = await supabaseAdmin
        .from('users')
        .select('auth_user_id')
        .eq('id', project.created_by)
        .single()

      const createdBy = isWebhookCall ? (creatorUser?.auth_user_id || project.created_by) : user.id

      // チャットルームを作成
      const { data: newRoom, error: roomError } = await supabaseAdmin
        .from('chat_rooms')
        .insert({
          project_id: project.id,
          name: project.title,
          description: `${project.title}のチャットルーム`,
          created_by: createdBy,
          is_active: true
        })
        .select('id')
        .single()

      if (!roomError && newRoom) {
        const chatRoomId = newRoom.id

        // 参加者を追加
        const participantsToAdd: Array<{ user_id: string; role: string }> = []

        // 1. 発注者（プロジェクト作成者）を追加
        const { data: projectCreator } = await supabaseAdmin
          .from('users')
          .select('auth_user_id')
          .eq('id', project.created_by)
          .single()

        if (projectCreator?.auth_user_id) {
          participantsToAdd.push({
            user_id: projectCreator.auth_user_id,
            role: 'admin'
          })
        }

        // 2. 案件承認者を追加
        if (project.org_id) {
          const { data: projectDetails } = await supabaseAdmin
            .from('projects')
            .select('approved_by')
            .eq('id', project.id)
            .single()

          if (projectDetails?.approved_by && projectDetails.approved_by !== project.created_by) {
            const { data: approver } = await supabaseAdmin
              .from('users')
              .select('auth_user_id')
              .eq('id', projectDetails.approved_by)
              .single()

            if (approver?.auth_user_id) {
              participantsToAdd.push({
                user_id: approver.auth_user_id,
                role: 'admin'
              })
            }
          }
        }

        // 3. 受注者を追加
        const { data: contractor } = await supabaseAdmin
          .from('users')
          .select('auth_user_id')
          .eq('id', contract.contractor_id)
          .single()

        if (contractor?.auth_user_id) {
          participantsToAdd.push({
            user_id: contractor.auth_user_id,
            role: 'member'
          })
        }

        // 参加者を一括追加
        if (participantsToAdd.length > 0) {
          await supabaseAdmin
            .from('chat_participants')
            .insert(participantsToAdd.map(p => ({
              room_id: chatRoomId,
              user_id: p.user_id,
              role: p.role
            })))
        }
      }
    }

    // 受注者と発注者に通知
    const notifications = []

    // 受注者に通知
    notifications.push({
      user_id: contract.contractor_id,
      type: 'order_acceptance_signed',
      title: '注文請書の署名が完了しました',
      message: `プロジェクト「${project.title}」の注文請書への署名が完了しました。チャットルームでやりとりを開始できます。`,
      data: {
        project_id: project.id,
        contract_id: contractId,
        signed_file_id: signedFileId
      }
    })

    // 発注者（プロジェクト作成者）に通知
    notifications.push({
      user_id: project.created_by,
      type: 'order_acceptance_signed',
      title: '注文請書の署名が完了しました',
      message: `プロジェクト「${project.title}」の注文請書への署名が完了しました。チャットルームでやりとりを開始できます。`,
      data: {
        project_id: project.id,
        contract_id: contractId,
        signed_file_id: signedFileId
      }
    })

    // 承認者にも通知（作成者と異なる場合）
    const { data: projectDetails } = await supabaseAdmin
      .from('projects')
      .select('approved_by')
      .eq('id', project.id)
      .single()

    if (projectDetails?.approved_by && projectDetails.approved_by !== project.created_by) {
      notifications.push({
        user_id: projectDetails.approved_by,
        type: 'order_acceptance_signed',
        title: '注文請書の署名が完了しました',
        message: `プロジェクト「${project.title}」の注文請書への署名が完了しました。チャットルームでやりとりを開始できます。`,
        data: {
          project_id: project.id,
          contract_id: contractId,
          signed_file_id: signedFileId
        }
      })
    }

    await supabaseAdmin
      .from('notifications')
      .insert(notifications)

    return NextResponse.json({
      message: '署名が完了しました。署名済みドキュメントはプロジェクトの「04_契約資料」フォルダに保存されています。チャットルームが作成されました。',
      signedAt,
      signedFileId
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ 署名完了確認エラー:', error)
    return NextResponse.json({
      message: '署名完了確認に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}
