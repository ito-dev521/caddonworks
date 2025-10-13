import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addFolderCollaboration } from '@/lib/box-collaboration'
import { getBoxFolderItems } from '@/lib/box'

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

          // 参加者を追加（重複を避けるため配列で管理）
          const participantsToAdd: Array<{ user_id: string; role: string; display_name: string }> = []

          // 1. 署名した発注者を追加（admin権限）
          participantsToAdd.push({
            user_id: user.id,
            role: 'admin',
            display_name: userProfile.display_name || user.email || 'Unknown'
          })
          console.log('署名した発注者を参加者に追加:', user.id)

          // 2. 案件承認者を追加（署名者と異なる場合のみ、admin権限）
          const { data: projectWithApprover } = await supabaseAdmin
            .from('projects')
            .select('approved_by')
            .eq('id', project.id)
            .single()

          if (projectWithApprover?.approved_by && projectWithApprover.approved_by !== userProfile.id) {
            const { data: approver } = await supabaseAdmin
              .from('users')
              .select('auth_user_id, display_name')
              .eq('id', projectWithApprover.approved_by)
              .single()

            if (approver?.auth_user_id) {
              participantsToAdd.push({
                user_id: approver.auth_user_id,
                role: 'admin',
                display_name: approver.display_name || 'Unknown'
              })
              console.log('案件承認者を参加者に追加:', approver.auth_user_id)
            }
          }

          // 3. 案件担当者を追加（担当者が署名者や承認者と異なる場合のみ、admin権限）
          if (project.assignee_name) {
            const { data: assignee } = await supabaseAdmin
              .from('users')
              .select('auth_user_id, display_name, id')
              .eq('display_name', project.assignee_name)
              .single()

            console.log('担当者検索結果:', assignee)

            if (assignee?.auth_user_id &&
                !participantsToAdd.some(p => p.user_id === assignee.auth_user_id)) {
              participantsToAdd.push({
                user_id: assignee.auth_user_id,
                role: 'admin',
                display_name: assignee.display_name || project.assignee_name
              })
              console.log('案件担当者を参加者に追加:', assignee.auth_user_id)
            }
          }

          // 4. 受注者を追加（member権限）
          if (contract.contractor_id) {
            const { data: contractor } = await supabaseAdmin
              .from('users')
              .select('auth_user_id, display_name')
              .eq('id', contract.contractor_id)
              .single()

            console.log('受注者検索結果:', contractor)

            if (contractor?.auth_user_id) {
              participantsToAdd.push({
                user_id: contractor.auth_user_id,
                role: 'member',
                display_name: contractor.display_name || 'Unknown'
              })
              console.log('受注者を参加者に追加:', contractor.auth_user_id)
            }
          }

          // 参加者を一括追加
          if (participantsToAdd.length > 0) {
            const { error: participantsError } = await supabaseAdmin
              .from('chat_participants')
              .insert(participantsToAdd.map(p => ({
                room_id: chatRoomId,
                user_id: p.user_id,
                role: p.role
              })))

            if (participantsError) {
              console.error('参加者追加エラー:', participantsError)
            } else {
              console.log(`参加者追加成功: ${participantsToAdd.length}名`)
            }
          }
        }
      } else {
        console.log('チャットルームは既に存在します - ルームID:', chatRoomId)

        // 既存のチャットルームでも署名した発注者を参加者に追加
        const { data: existingParticipant } = await supabaseAdmin
          .from('chat_participants')
          .select('id')
          .eq('room_id', chatRoomId)
          .eq('user_id', user.id)
          .single()

        if (!existingParticipant) {
          const { error: addParticipantError } = await supabaseAdmin
            .from('chat_participants')
            .insert({
              room_id: chatRoomId,
              user_id: user.id,
              role: 'admin'
            })

          if (addParticipantError) {
            console.error('既存チャットルームへの発注者追加エラー:', addParticipantError)
          } else {
            console.log('既存チャットルームに発注者を追加しました')
          }
        }

        // 承認者も追加（署名者と異なる場合）
        const { data: projectWithApprover } = await supabaseAdmin
          .from('projects')
          .select('approved_by')
          .eq('id', project.id)
          .single()

        if (projectWithApprover?.approved_by && projectWithApprover.approved_by !== userProfile.id) {
          const { data: approver } = await supabaseAdmin
            .from('users')
            .select('auth_user_id')
            .eq('id', projectWithApprover.approved_by)
            .single()

          if (approver?.auth_user_id) {
            const { data: existingApproverParticipant } = await supabaseAdmin
              .from('chat_participants')
              .select('id')
              .eq('room_id', chatRoomId)
              .eq('user_id', approver.auth_user_id)
              .single()

            if (!existingApproverParticipant) {
              const { error: addApproverError } = await supabaseAdmin
                .from('chat_participants')
                .insert({
                  room_id: chatRoomId,
                  user_id: approver.auth_user_id,
                  role: 'admin'
                })

              if (addApproverError) {
                console.error('既存チャットルームへの承認者追加エラー:', addApproverError)
              } else {
                console.log('既存チャットルームに承認者を追加しました')
              }
            }
          }
        }
      }
    }

    // BOXフォルダへのアクセス権限を付与
    try {
      // プロジェクト情報とBOXフォルダIDを取得
      const { data: projectWithBox } = await supabaseAdmin
        .from('projects')
        .select('box_folder_id, box_subfolders, title, org_id')
        .eq('id', contract.project_id)
        .single()

      if (!projectWithBox) {
        console.error('❌ プロジェクト情報の取得に失敗しました')
        throw new Error('プロジェクト情報の取得に失敗しました')
      }

      let boxFolderId = projectWithBox.box_folder_id

      // BOXフォルダが未設定の場合、自動作成を試行
      if (!boxFolderId) {
        console.log('📦 BOXフォルダが未設定のため、自動作成を開始します')

        try {
          // まず組織情報を取得
          const { data: organization, error: orgError } = await supabaseAdmin
            .from('organizations')
            .select('name')
            .eq('id', projectWithBox.org_id)
            .single()

          if (orgError || !organization) {
            throw new Error('組織情報を取得できません')
          }

          // 会社フォルダを取得または作成
          const { createCompanyFolder, createProjectFolderStructure } = await import('@/lib/box')
          const companyFolder = await createCompanyFolder(organization.name)
          console.log(`📁 会社フォルダ取得: ${organization.name} (ID: ${companyFolder.id})`)

          // プロジェクトフォルダ構造を作成
          const folderStructure = await createProjectFolderStructure(
            projectWithBox.title,
            contract.project_id,
            companyFolder.id
          )
          console.log(`📁 プロジェクトフォルダ作成: ${projectWithBox.title} (ID: ${folderStructure.folderId})`)

          // データベースにBoxフォルダIDを保存
          const { error: updateError } = await supabaseAdmin
            .from('projects')
            .update({ box_folder_id: folderStructure.folderId })
            .eq('id', contract.project_id)

          if (updateError) {
            console.error('❌ プロジェクトのbox_folder_id更新に失敗:', updateError)
            throw new Error('プロジェクトのbox_folder_id更新に失敗しました')
          }

          boxFolderId = folderStructure.folderId
          console.log('✅ BOXフォルダを自動作成し、データベースに保存しました')
        } catch (createError: any) {
          console.error('❌ BOXフォルダの自動作成に失敗:', createError)
          throw new Error(`BOXフォルダの作成に失敗しました: ${createError.message}`)
        }
      }

      console.log('📁 受注者にBOXアクセス権限を付与開始')

      // 受注者情報を取得
      const { data: contractorInfo } = await supabaseAdmin
        .from('users')
        .select('email, display_name')
        .eq('id', contract.contractor_id)
        .single()

      if (!contractorInfo?.email) {
        console.error('❌ 受注者のメールアドレスが見つかりません')
        throw new Error('受注者のメールアドレスが見つかりません')
      }

      console.log('✅ 受注者メールアドレス:', contractorInfo.email)
      console.log('📦 BoxフォルダID:', boxFolderId)
      console.log('📧 コラボレーション追加開始...')

      // メインプロジェクトフォルダに権限付与（editor権限、メールアドレスで直接コラボレーション）
      const mainFolderResult = await addFolderCollaboration(
        boxFolderId,
        contractorInfo.email,
        'editor',
        projectWithBox.title
      )

      console.log('📊 コラボレーション追加結果:', {
        success: mainFolderResult.success,
        collaborationId: mainFolderResult.collaborationId,
        error: mainFolderResult.error
      })

      if (!mainFolderResult.success) {
        console.error('❌ メインフォルダへの権限付与失敗:', mainFolderResult.error)
        throw new Error(`メインフォルダへの権限付与に失敗しました: ${mainFolderResult.error}`)
      }

      console.log('✅ メインプロジェクトフォルダへのアクセス権限を付与しました')
      console.log('📧 Boxから受注者へ招待メールが送信されました:', contractorInfo.email)
      console.log('💡 コラボレーションID:', mainFolderResult.collaborationId)

      // サブフォルダにも権限付与
      try {
        // フォルダ構造を直接取得して権限付与
        console.log('📁 サブフォルダに権限を付与します')

        const items = await getBoxFolderItems(boxFolderId)
        const subfolders = items.filter(item => item.type === 'folder')

        for (const subfolder of subfolders) {
          const subfolderResult = await addFolderCollaboration(
            subfolder.id,
            contractorInfo.email,
            'editor',
            `${projectWithBox.title} - ${subfolder.name}`
          )

          if (subfolderResult.success) {
            console.log(`✅ サブフォルダ「${subfolder.name}」へのアクセス権限を付与しました`)
          } else {
            console.warn(`⚠️ サブフォルダ「${subfolder.name}」への権限付与失敗:`, subfolderResult.error)
          }

          // API Rate Limitを考慮
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      } catch (subfolderError) {
        console.error('⚠️ サブフォルダへの権限付与でエラーが発生しました（処理は継続）:', subfolderError)
        // サブフォルダの権限付与失敗は警告のみで継続
      }

    } catch (boxError: any) {
      console.error('❌ BOXアクセス権限付与エラー:', boxError)
      // BOXエラーの場合、ユーザーに通知を送信
      await supabaseAdmin.from('notifications').insert({
        user_id: contract.contractor_id,
        type: 'error',
        title: 'BOX招待エラー',
        message: `案件「${contract.contract_title}」のBOXフォルダへの招待に失敗しました。管理者にお問い合わせください。エラー: ${boxError.message}`,
        data: {
          project_id: contract.project_id,
          contract_id: contract.id,
          error: boxError.message
        }
      })
      // BOXエラーでも契約署名は成功とする（後で手動で招待可能）
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

    // 注文請書を自動生成（発注者署名完了後）
    let orderAcceptanceInfo = null
    try {
      console.log('📋 注文請書を自動生成します')

      // 注文請書生成APIを内部呼び出し
      const orderAcceptanceResponse = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/contracts/${contractId}/order-acceptance`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (orderAcceptanceResponse.ok) {
        const orderAcceptanceResult = await orderAcceptanceResponse.json()
        orderAcceptanceInfo = {
          orderAcceptanceNumber: orderAcceptanceResult.orderAcceptanceNumber,
          fileName: orderAcceptanceResult.fileName,
          boxFileId: orderAcceptanceResult.boxFileId
        }
        console.log('✅ 注文請書の自動生成が完了しました:', orderAcceptanceInfo)

        // 注文請書生成後、自動的にBox Sign署名リクエストを送信
        try {
          console.log('📝 注文請書のBox Sign署名リクエストを送信します')

          const signRequestResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/contracts/${contractId}/order-acceptance/sign`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            }
          )

          if (signRequestResponse.ok) {
            const signRequestResult = await signRequestResponse.json()
            console.log('✅ Box Sign署名リクエストの送信が完了しました:', signRequestResult.signRequestId)

            // orderAcceptanceInfoに署名リクエスト情報を追加
            orderAcceptanceInfo.signRequestId = signRequestResult.signRequestId
            orderAcceptanceInfo.prepareUrl = signRequestResult.prepareUrl
          } else {
            const errorResult = await signRequestResponse.json()
            console.error('⚠️ Box Sign署名リクエストの送信に失敗しました:', errorResult.message)
            // Box Sign失敗は警告のみで、注文請書生成は成功とする
          }
        } catch (signRequestError: any) {
          console.error('⚠️ Box Sign署名リクエスト送信エラー（注文請書生成は成功）:', signRequestError)
          // Box Sign失敗は警告のみで、注文請書生成は成功とする
        }
      } else {
        const errorResult = await orderAcceptanceResponse.json()
        console.error('⚠️ 注文請書の自動生成に失敗しました:', errorResult.message)
        // 注文請書生成失敗は警告のみで、契約署名は成功とする
      }
    } catch (orderAcceptanceError: any) {
      console.error('⚠️ 注文請書生成エラー（契約署名は成功）:', orderAcceptanceError)
      // 注文請書生成失敗は警告のみで、契約署名は成功とする
    }

    // 完了メッセージを作成
    let successMessage = '契約に署名しました'
    if (orderAcceptanceInfo) {
      if (orderAcceptanceInfo.signRequestId) {
        successMessage += '。注文請書を生成し、受注者にBox Sign署名リクエストを送信しました。'
      } else {
        successMessage += '。注文請書も生成されました。'
      }
    }

    return NextResponse.json({
      message: successMessage,
      contract: updatedContract,
      orderAcceptanceInfo
    }, { status: 200 })

  } catch (error) {
    console.error('契約署名エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
