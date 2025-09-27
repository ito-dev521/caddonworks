import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'
import { boxSignAPI, createProjectSigners } from '@/lib/box-sign'
import { generateCompletionReportPDF } from '@/lib/completion-report-generator'
import { uploadFileToBox } from '@/lib/box'

const supabaseAdmin = createSupabaseAdmin()

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, formal_name, email')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 完了届を取得
    const { data: report, error: reportError } = await supabaseAdmin
      .from('completion_reports')
      .select(`
        *,
        projects!inner(
          id,
          title,
          location,
          category,
          start_date,
          end_date,
          budget,
          org_id
        ),
        contracts!inner(
          id,
          bid_amount,
          start_date,
          end_date,
          signed_at
        ),
        organizations!inner(
          id,
          name
        )
      `)
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    // 権限チェック：自分の完了届のみ
    if (report.contractor_id !== userProfile.id) {
      return NextResponse.json({ message: 'この完了届を署名する権限がありません' }, { status: 403 })
    }

    // 既にBox Sign署名リクエストが存在する場合はエラー
    if (report.box_sign_request_id) {
      return NextResponse.json({
        message: 'この完了届は既にデジタル署名リクエストが作成されています',
        signRequestId: report.box_sign_request_id
      }, { status: 409 })
    }

    // 発注者の管理者メールアドレスを取得
    const { data: orgAdmins, error: orgAdminError } = await supabaseAdmin
      .from('memberships')
      .select(`
        users!inner(
          id,
          email,
          display_name,
          formal_name
        )
      `)
      .eq('org_id', report.org_id)
      .eq('role', 'OrgAdmin')
      .limit(1)

    if (orgAdminError || !orgAdmins || orgAdmins.length === 0) {
      return NextResponse.json({ message: '発注者の管理者が見つかりません' }, { status: 400 })
    }

    const orgAdmin = orgAdmins[0].users

    try {
      // 1. 完了届PDFを生成
      const pdfBuffer = await generateCompletionReportPDF({
        project: {
          ...report.projects,
          client_organization: report.organizations,
          contractor_organization: null
        },
        contract: report.contracts,
        contractor: userProfile,
        completionDate: report.actual_completion_date,
        createdAt: new Date().toISOString().split('T')[0]
      })

      // 2. プロジェクトの04_契約データフォルダを取得
      let contractFolderId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID || '0'

      // プロジェクトのBox情報を取得して04_契約データフォルダを特定
      const { data: projectData } = await supabaseAdmin
        .from('projects')
        .select('box_folder_id')
        .eq('id', report.project_id)
        .single()

      if (projectData?.box_folder_id) {
        try {
          // プロジェクトフォルダ内から04_契約データフォルダを探す
          const { getBoxFolderItems } = await import('@/lib/box')
          const projectItems = await getBoxFolderItems(projectData.box_folder_id)

          const contractFolder = projectItems.find(item =>
            item.type === 'folder' &&
            (item.name.includes('04_契約') || item.name.includes('契約'))
          )

          if (contractFolder) {
            contractFolderId = contractFolder.id
          }
        } catch (error) {
          console.warn('契約フォルダの取得に失敗しました、ルートフォルダを使用します:', error)
        }
      }

      // 3. PDFをBoxの04_契約データフォルダにアップロード
      const fileName = `完了届_${report.projects.title}_${report.report_number}.pdf`
      const boxFileId = await uploadFileToBox(
        pdfBuffer,
        fileName,
        contractFolderId
      )

      // 4. 署名者を設定
      const signers = createProjectSigners(
        userProfile.email || `${userProfile.id}@contractor.local`,
        orgAdmin.email || `${orgAdmin.id}@organization.local`,
        userProfile.formal_name || userProfile.display_name,
        orgAdmin.formal_name || orgAdmin.display_name
      )

      // 5. Box Sign署名リクエストを作成
      const signatureResponse = await boxSignAPI.createSignatureRequest({
        documentName: fileName,
        boxFileId,
        signers,
        message: `土木設計業務「${report.projects.title}」の完了届にデジタル署名をお願いします。`,
        daysUntilExpiration: 30,
        isDocumentPreparationNeeded: false,
        redirectUrl: `${process.env.NEXTAUTH_URL}/completion-reports/${reportId}`,
        declineRedirectUrl: `${process.env.NEXTAUTH_URL}/completion-reports/${reportId}?declined=true`
      })

      if (!signatureResponse.success) {
        throw new Error(signatureResponse.error || 'Box Sign署名リクエストの作成に失敗しました')
      }

      // 6. 完了届にBox Sign情報を更新
      const { data: updatedReport, error: updateError } = await supabaseAdmin
        .from('completion_reports')
        .update({
          box_sign_request_id: signatureResponse.signRequestId,
          status: 'submitted',
          submission_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', reportId)
        .select(`
          *,
          projects!inner(id, title),
          organizations!inner(id, name)
        `)
        .single()

      if (updateError) {
        throw new Error('完了届の更新に失敗しました')
      }

      // 7. 発注者に署名依頼通知
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: orgAdmin.id,
          type: 'completion_report_signature_request',
          title: '業務完了届のデジタル署名依頼',
          message: `プロジェクト「${report.projects.title}」の業務完了届にデジタル署名をお願いします。`,
          data: {
            project_id: report.project_id,
            completion_report_id: reportId,
            box_sign_request_id: signatureResponse.signRequestId,
            contractor_id: userProfile.id,
            contractor_name: userProfile.display_name
          }
        })

      return NextResponse.json({
        message: 'デジタル署名リクエストを作成しました',
        completion_report: updatedReport,
        box_sign_request_id: signatureResponse.signRequestId,
        signing_urls: signatureResponse.signingUrls,
        prepare_url: signatureResponse.prepareUrl
      }, { status: 201 })

    } catch (error: any) {
      return NextResponse.json({
        message: 'デジタル署名の作成に失敗しました',
        error: error.message
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Completion report sign API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// 署名ステータスを確認
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reportId = params.id

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 完了届を取得
    const { data: report, error: reportError } = await supabaseAdmin
      .from('completion_reports')
      .select('id, box_sign_request_id, contractor_id, org_id')
      .eq('id', reportId)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ message: '完了届が見つかりません' }, { status: 404 })
    }

    if (!report.box_sign_request_id) {
      return NextResponse.json({ message: 'デジタル署名リクエストが見つかりません' }, { status: 404 })
    }

    // Box Signステータスを確認
    const signatureStatus = await boxSignAPI.getSignatureStatus(report.box_sign_request_id)

    if (!signatureStatus) {
      return NextResponse.json({ message: '署名ステータスの取得に失敗しました' }, { status: 500 })
    }

    // 署名完了時の処理
    if (signatureStatus.status === 'signed' && signatureStatus.signFiles?.files?.[0]) {
      const signedDocumentId = signatureStatus.signFiles.files[0].id

      // 完了届を承認済みに更新
      await supabaseAdmin
        .from('completion_reports')
        .update({
          status: 'approved',
          signed_document_id: signedDocumentId,
          contractor_signed_at: signatureStatus.signers.find(s => s.role === 'signer' && s.hasSigned)?.signedAt,
          org_signed_at: signatureStatus.completedAt,
          approved_at: signatureStatus.completedAt
        })
        .eq('id', reportId)

      // プロジェクトと契約を完了状態に更新
      await supabaseAdmin
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', report.id)

      await supabaseAdmin
        .from('contracts')
        .update({ status: 'completed' })
        .eq('completion_report_id', reportId)
    }

    return NextResponse.json({
      signature_status: signatureStatus,
      signed_document_id: signatureStatus.signFiles?.files?.[0]?.id
    })

  } catch (error) {
    console.error('Signature status check API error:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}