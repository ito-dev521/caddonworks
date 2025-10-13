import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { addFolderCollaboration } from '@/lib/box-collaboration'
import { getBoxFolderItems, createCompanyFolder, createProjectFolderStructure } from '@/lib/box'

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

/**
 * Box招待を手動で再送信するエンドポイント
 * 既に契約済みの案件に対して、受注者へのBox招待メールを送信します
 */
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

    // 契約が署名済みでない場合はエラー
    if (contract.status !== 'signed') {
      return NextResponse.json(
        { message: 'この契約はまだ署名完了していません（両者の署名が必要です）' },
        { status: 400 }
      )
    }

    // プロジェクト情報とBOXフォルダIDを取得
    const { data: projectWithBox } = await supabaseAdmin
      .from('projects')
      .select('box_folder_id, title, org_id')
      .eq('id', contract.project_id)
      .single()

    if (!projectWithBox) {
      console.error('❌ プロジェクト情報の取得に失敗しました')
      return NextResponse.json(
        { message: 'プロジェクト情報の取得に失敗しました' },
        { status: 404 }
      )
    }

    let boxFolderId = projectWithBox.box_folder_id

    // BOXフォルダが未設定の場合、自動作成を試行
    if (!boxFolderId) {
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
        const companyFolder = await createCompanyFolder(organization.name)

        // プロジェクトフォルダ構造を作成
        const folderStructure = await createProjectFolderStructure(
          projectWithBox.title,
          contract.project_id,
          companyFolder.id
        )

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
      } catch (createError: any) {
        console.error('❌ BOXフォルダの自動作成に失敗:', createError)
        return NextResponse.json(
          { message: `BOXフォルダの作成に失敗しました: ${createError.message}` },
          { status: 500 }
        )
      }
    }

    // 受注者情報を取得
    const { data: contractorInfo } = await supabaseAdmin
      .from('users')
      .select('email, display_name')
      .eq('id', contract.contractor_id)
      .single()

    if (!contractorInfo?.email) {
      console.error('❌ 受注者のメールアドレスが見つかりません')
      return NextResponse.json(
        { message: '受注者のメールアドレスが見つかりません' },
        { status: 400 }
      )
    }

    // メインプロジェクトフォルダに権限付与（editor権限、メールアドレスで直接コラボレーション）
    const mainFolderResult = await addFolderCollaboration(
      boxFolderId,
      contractorInfo.email,
      'editor',
      projectWithBox.title
    )

    if (!mainFolderResult.success) {
      console.error('❌ メインフォルダへの権限付与失敗:', mainFolderResult.error)
      return NextResponse.json(
        { message: `メインフォルダへの権限付与に失敗しました: ${mainFolderResult.error}` },
        { status: 500 }
      )
    }

    const invitedFolders: string[] = [projectWithBox.title]

    // サブフォルダにも権限付与
    try {
      // フォルダ構造を直接取得して権限付与
      const items = await getBoxFolderItems(boxFolderId)
      const subfolders = items.filter(item => item.type === 'folder')

      for (const subfolder of subfolders) {
        // サブフォルダ（標準5フォルダ）は削除不可のviewer_uploader権限を付与
        const subfolderResult = await addFolderCollaboration(
          subfolder.id,
          contractorInfo.email,
          'viewer_uploader', // 削除不可、閲覧・ダウンロード・アップロード可能
          `${projectWithBox.title} - ${subfolder.name}`
        )

        if (subfolderResult.success) {
          invitedFolders.push(subfolder.name)
        }

        // API Rate Limitを考慮
        await new Promise(resolve => setTimeout(resolve, 300))
      }
    } catch (subfolderError) {
      console.error('⚠️ サブフォルダへの権限付与でエラーが発生しました（処理は継続）:', subfolderError)
      // サブフォルダの権限付与失敗は警告のみで継続
    }

    // 成功通知を受注者に送信
    await supabaseAdmin.from('notifications').insert({
      user_id: contract.contractor_id,
      type: 'info',
      title: 'BOXフォルダへの招待を送信しました',
      message: `案件「${contract.contract_title}」のBOXフォルダへの招待メールを送信しました。メールをご確認ください。`,
      data: {
        project_id: contract.project_id,
        contract_id: contract.id,
        box_folder_id: boxFolderId,
        invited_folders: invitedFolders
      }
    })

    // Box招待送信日時を記録（初回のみ）
    if (!contract.box_invitation_sent_at) {
      await supabaseAdmin
        .from('contracts')
        .update({ box_invitation_sent_at: new Date().toISOString() })
        .eq('id', contractId)
    }

    return NextResponse.json({
      message: 'Box招待メールを送信しました',
      contractor_email: contractorInfo.email,
      invited_folders: invitedFolders,
      box_folder_id: boxFolderId
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Box招待再送信エラー:', error)
    return NextResponse.json(
      { message: `サーバーエラーが発生しました: ${error.message}` },
      { status: 500 }
    )
  }
}
