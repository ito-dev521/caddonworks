import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteBoxFolder } from '@/lib/box'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Supabaseクライアントを作成
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 案件情報を取得
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // 組織情報を別途取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', project.org_id)
      .single()

    if (orgError) {
      console.error('組織情報取得エラー:', orgError)
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック
    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id
    const isContractor = membership.role === 'Contractor'

    if (!isOrgAdmin && !isContractor) {
      return NextResponse.json({ message: 'この案件を閲覧する権限がありません' }, { status: 403 })
    }

    // レスポンス用のデータを整形
    const formattedProject = {
      id: project.id,
      title: project.title,
      description: project.description,
      status: project.status,
      budget: project.budget,
      start_date: project.start_date,
      end_date: project.end_date,
      category: project.category,
      created_at: project.created_at,
      org_id: project.org_id,
      org_name: organization?.name,
      required_contractors: project.required_contractors,
      assignee_name: project.assignee_name,
      bidding_deadline: project.bidding_deadline
    }

    return NextResponse.json({ project: formattedProject }, { status: 200 })

  } catch (error) {
    console.error('案件取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    // Supabaseクライアントを作成
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // リクエストボディを取得
    const body = await request.json()
        const { title, description, budget, start_date, end_date, category, required_contractors, required_level, assignee_name, status, isStatusUpdate } = body

    // ステータス更新のみの場合は必須フィールドの検証をスキップ
    const isStatusOnlyUpdate = isStatusUpdate === true
    

    // 通常の更新時のみ必須フィールドの検証
    if (!isStatusOnlyUpdate && (!title || !description || !budget || !start_date || !end_date || !category || !required_contractors)) {
      return NextResponse.json({ message: '必須フィールドが不足しています' }, { status: 400 })
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック（OrgAdminのみ編集可能）
    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id

    if (!isOrgAdmin) {
      return NextResponse.json({ message: 'この案件を編集する権限がありません' }, { status: 403 })
    }

    // 案件を更新
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    // ステータス更新のみの場合
    if (isStatusOnlyUpdate) {
      updateData.status = status
    } else {
      // 通常の更新時は全フィールドを更新
      updateData.title = title
      updateData.description = description
      updateData.budget = Number(budget)
      updateData.start_date = start_date
      updateData.end_date = end_date
      updateData.category = category
      updateData.required_contractors = Number(required_contractors)
      updateData.required_level = required_level || 'beginner'
      updateData.assignee_name = assignee_name || null

      // ステータスが提供されている場合は追加
      if (status) {
        updateData.status = status

        // ステータスが完了系に変更された場合、完了日時を設定
        if (['completed', 'cancelled', 'archived'].includes(status) &&
            !['completed', 'cancelled', 'archived'].includes(project.status)) {
          updateData.completed_at = new Date().toISOString()
        }
      }
    }

    const { data: updatedProject, error: updateError } = await supabaseAdmin
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single()

    if (updateError) {
      console.error('案件更新エラー:', updateError)
      return NextResponse.json({ message: '案件の更新に失敗しました' }, { status: 500 })
    }

    // ステータスが「completed」に変更された場合、受注者と発注者に通知を送信
    if (status === 'completed') {
      try {
        // 受注者への通知
        if (updatedProject.contractor_id) {
          const { data: contractor } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', updatedProject.contractor_id)
            .single()

          if (contractor) {
            await supabaseAdmin.from('notifications').insert({
              user_id: contractor.id,
              type: 'project_completed',
              title: '案件が完了しました',
              message: `案件「${updatedProject.title}」が完了しました。評価と業務完了届の作成をお待ちください。`,
              data: { project_id: projectId, project_title: updatedProject.title }
            })
          }
        }

        // 発注者(OrgAdmin全員)への通知: 評価と業務完了届の準備ができました
        const { data: orgAdmins } = await supabaseAdmin
          .from('memberships')
          .select('user_id')
          .eq('org_id', updatedProject.org_id)
          .eq('role', 'OrgAdmin')

        if (orgAdmins && orgAdmins.length > 0) {
          const notifications = orgAdmins.map((m) => ({
            user_id: m.user_id,
            type: 'project_ready_for_evaluation',
            title: '受注者評価と業務完了届の準備ができました',
            message: `案件「${updatedProject.title}」が完了しました。まず受注者評価を行い、その後 業務完了届 を発行してください。`,
            data: { project_id: projectId, project_title: updatedProject.title }
          }))
          await supabaseAdmin.from('notifications').insert(notifications)
        }
      } catch (notificationError) {
        console.error('業務完了通知送信エラー:', notificationError)
        // 通知エラーが発生しても案件更新は成功しているので、処理を続行
      }
    }

    return NextResponse.json({
      message: '案件が正常に更新されました',
      project: updatedProject
    }, { status: 200 })

  } catch (error) {
    console.error('案件更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const projectId = params.id

    if (!projectId) {
      return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // Supabaseクライアントを作成
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

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userProfileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userProfileError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // ユーザーのロールを確認
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: '組織情報が見つかりません' }, { status: 403 })
    }

    // 権限チェック（OrgAdminかつ同じ組織のみ削除可能）
    const isOrgAdmin = membership.role === 'OrgAdmin' && project.org_id === membership.org_id

    if (!isOrgAdmin) {
      return NextResponse.json({ message: 'この案件を削除する権限がありません' }, { status: 403 })
    }

    // 案件の状態チェック（進行中の案件は削除不可）
    if (['active', 'contract_pending', 'in_progress'].includes(project.status)) {
      return NextResponse.json({
        message: '進行中の案件は削除できません。先に案件を完了またはキャンセルしてください。'
      }, { status: 400 })
    }

    // 関連データを確認（入札や契約がある場合は削除を制限）
    const { data: bids } = await supabaseAdmin
      .from('bids')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    const { data: contracts } = await supabaseAdmin
      .from('contracts')
      .select('id')
      .eq('project_id', projectId)
      .limit(1)

    if (bids && bids.length > 0) {
      return NextResponse.json({
        message: '入札が存在する案件は削除できません。'
      }, { status: 400 })
    }

    if (contracts && contracts.length > 0) {
      return NextResponse.json({
        message: '契約が存在する案件は削除できません。'
      }, { status: 400 })
    }

    // クエリパラメータでBox削除タイプを確認
    const url = new URL(request.url)
    const deleteType = url.searchParams.get('deleteType') || 'manual'
    const preserveBox = deleteType === 'auto_archive' // 30日自動削除の場合

    // Boxフォルダの削除処理（手動削除の場合のみ）
    if (!preserveBox && project.box_folder_id) {
      try {
        console.log(`🗑️ Deleting Box folder for project: ${projectId} (folder: ${project.box_folder_id})`)
        await deleteBoxFolder(project.box_folder_id, true)
        console.log(`✅ Successfully deleted Box folder: ${project.box_folder_id}`)
      } catch (boxError) {
        console.error('❌ Box folder deletion failed:', boxError)
        // Box削除が失敗してもプロジェクト削除は継続
        console.warn('⚠️ Continuing with project deletion despite Box folder deletion failure')
      }
    } else if (preserveBox) {
      console.log(`📦 Preserving Box folder for 30-day auto deletion: ${project.box_folder_id}`)
    } else {
      console.log(`📂 No Box folder to delete for project: ${projectId}`)
    }

    // 案件を削除
    const { error: deleteError } = await supabaseAdmin
      .from('projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('案件削除エラー:', deleteError)
      return NextResponse.json({ message: '案件の削除に失敗しました' }, { status: 500 })
    }

    const deletionMessage = preserveBox
      ? '案件が正常に削除されました（Boxフォルダは保持されています）'
      : '案件が正常に削除されました'

    return NextResponse.json({
      message: deletionMessage,
      box_folder_preserved: preserveBox
    }, { status: 200 })

  } catch (error) {
    console.error('案件削除APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}