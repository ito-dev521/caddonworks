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
        .select('box_folder_id, box_subfolders, title')
        .eq('id', contract.project_id)
        .single()

      if (projectWithBox?.box_folder_id) {
        console.log('📁 受注者にBOXアクセス権限を付与開始')

        // 受注者情報を取得
        const { data: contractorInfo } = await supabaseAdmin
          .from('users')
          .select('email, display_name')
          .eq('id', contract.contractor_id)
          .single()

        if (contractorInfo?.email) {
          console.log('✅ 受注者メールアドレス:', contractorInfo.email)

          // メインプロジェクトフォルダに権限付与（editor権限、メールアドレスで直接コラボレーション）
          const mainFolderResult = await addFolderCollaboration(
            projectWithBox.box_folder_id,
            contractorInfo.email,
            'editor',
            projectWithBox.title
          )

          if (mainFolderResult.success) {
            console.log('✅ メインプロジェクトフォルダへのアクセス権限を付与しました')

            // サブフォルダにも権限付与
            if (projectWithBox.box_subfolders) {
              const subfolders = projectWithBox.box_subfolders as Record<string, string>

              for (const [folderName, folderId] of Object.entries(subfolders)) {
                if (folderId) {
                  const subfolderResult = await addFolderCollaboration(
                    folderId,
                    contractorInfo.email,
                    'editor',
                    `${projectWithBox.title} - ${folderName}`
                  )

                  if (subfolderResult.success) {
                    console.log(`✅ サブフォルダ「${folderName}」へのアクセス権限を付与しました`)
                  } else {
                    console.error(`❌ サブフォルダ「${folderName}」への権限付与失敗:`, subfolderResult.error)
                  }

                  // API Rate Limitを考慮
                  await new Promise(resolve => setTimeout(resolve, 300))
                }
              }
            } else {
              // box_subfoldersがない場合、フォルダ構造を直接取得して権限付与
              console.log('📁 サブフォルダ情報がないため、BOXから直接取得します')

              try {
                const items = await getBoxFolderItems(projectWithBox.box_folder_id)
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
                    console.error(`❌ サブフォルダ「${subfolder.name}」への権限付与失敗:`, subfolderResult.error)
                  }

                  // API Rate Limitを考慮
                  await new Promise(resolve => setTimeout(resolve, 300))
                }
              } catch (folderError) {
                console.error('❌ サブフォルダ取得エラー:', folderError)
              }
            }

          } else {
            console.error('❌ メインフォルダへの権限付与失敗:', mainFolderResult.error)
          }
        } else {
          console.warn('⚠️ 受注者のメールアドレスが見つかりません')
        }
      } else {
        console.warn('⚠️ プロジェクトにBOXフォルダが設定されていません')
      }
    } catch (boxError) {
      console.error('❌ BOXアクセス権限付与エラー（処理は継続）:', boxError)
      // BOXエラーでも契約署名は成功とする
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
