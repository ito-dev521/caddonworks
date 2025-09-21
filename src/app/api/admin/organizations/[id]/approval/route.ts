import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id
    const { action, reason } = await request.json()

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ message: '無効なアクションです' }, { status: 400 })
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json({ message: '却下の場合は理由が必要です' }, { status: 400 })
    }

    // 認証ヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 管理者権限チェック（role='Admin'のユーザーのみ）
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile || userProfile.role !== 'Admin') {
      return NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 })
    }

    // 組織を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織が見つかりません' }, { status: 404 })
    }

    const updateData: any = {
      approval_status: action === 'approve' ? 'approved' : 'rejected',
      approved_by: user.id,
      approved_at: new Date().toISOString()
    }

    if (action === 'approve') {
      updateData.active = true
      updateData.rejection_reason = null
    } else {
      updateData.active = false
      updateData.rejection_reason = reason
    }

    // 組織情報を更新
    const { data: updatedOrg, error: updateError } = await supabaseAdmin
      .from('organizations')
      .update(updateData)
      .eq('id', organizationId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        message: '組織更新に失敗しました',
        error: updateError.message
      }, { status: 500 })
    }

    // 承認の場合は会社フォルダを作成し、組織管理者をコラボレーターとして追加
    if (action === 'approve') {
      try {
        // 会社フォルダを作成
        const companyFolderResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/company-folder`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ companyName: organization.name })
        })

        if (companyFolderResponse.ok) {
          const { folderId: companyFolderId } = await companyFolderResponse.json()

          // 組織にBOXフォルダIDを保存
          await supabaseAdmin
            .from('organizations')
            .update({ box_folder_id: companyFolderId })
            .eq('id', organizationId)

          // 組織管理者（OrgAdmin）をBOXフォルダのコラボレーターとして追加
          const { data: orgAdmins, error: adminError } = await supabaseAdmin
            .from('memberships')
            .select(`
              users!inner(email)
            `)
            .eq('org_id', organizationId)
            .eq('role', 'OrgAdmin')

          if (!adminError && orgAdmins?.length > 0) {
            const { addBoxCollaborator } = await import('@/lib/box')

            for (const admin of orgAdmins) {
              try {
                const userEmail = (admin as any).users.email
                await addBoxCollaborator(companyFolderId, userEmail, 'co-owner')
                console.log(`✅ Added ${userEmail} as collaborator to company folder`)
              } catch (collabError) {
                console.warn(`⚠️ Failed to add collaborator:`, collabError)
              }
            }
          }

          updatedOrg.box_folder_id = companyFolderId
        } else {
          console.warn('会社フォルダ作成に失敗しましたが、承認処理は継続します')
        }
      } catch (boxError) {
        console.warn('会社フォルダ作成でエラーが発生しましたが、承認処理は継続します:', boxError)
      }
    }

    return NextResponse.json({
      message: action === 'approve' ? '組織が承認されました' : '組織が却下されました',
      organization: updatedOrg
    }, { status: 200 })

  } catch (error) {
    console.error('組織承認APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}