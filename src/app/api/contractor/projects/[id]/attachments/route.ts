import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

const supabase = createSupabaseAdmin()

// 受注者向けの案件添付資料一覧取得
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  
  try {
    const { id: projectId } = params

    // 認証チェック
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, email, display_name')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json({ message: 'ユーザープロフィールが見つかりません' }, { status: 403 })
    }

    // 案件の存在確認
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, title, org_id, contractor_id, status')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // 受注者権限チェック（契約者または組織メンバー）
    let hasAccess = false

    // 1. 直接契約者として指定されている場合
    if (project.contractor_id === userProfile.id) {
      hasAccess = true
    }

    // 2. 契約テーブルで受注者として指定されている場合（署名済み契約）
    if (!hasAccess) {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('contractor_id, status')
        .eq('project_id', projectId)
        .eq('contractor_id', userProfile.id)
        .eq('status', 'signed')
        .single()

      if (!contractError && contract) {
        hasAccess = true
      }
    }

    // 3. 契約テーブルで受注者として指定されている場合（承認済み契約）
    if (!hasAccess) {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('contractor_id, status')
        .eq('project_id', projectId)
        .eq('contractor_id', userProfile.id)
        .eq('status', 'approved')
        .single()

      if (!contractError && contract) {
        hasAccess = true
      }
    }

    // 4. 応募（bid）テーブルで受注者として指定されている場合
    if (!hasAccess) {
      const { data: bid, error: bidError } = await supabase
        .from('bids')
        .select('contractor_id, status')
        .eq('project_id', projectId)
        .eq('contractor_id', userProfile.id)
        .in('status', ['submitted', 'accepted', 'awarded'])
        .single()

      if (!bidError && bid) {
        hasAccess = true
      }
    }

    // 5. 組織メンバーとしてアクセス権がある場合
    if (!hasAccess) {
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('role')
        .eq('user_id', userProfile.id)
        .eq('org_id', project.org_id)
        .eq('role', 'Contractor')
        .single()

      if (!membershipError && membership) {
        hasAccess = true
      }
    }

    // 6. 受注者として案件詳細を閲覧する権限（応募前でも可）
    if (!hasAccess) {
      // 案件が募集状態（bidding）の場合、受注者は詳細を閲覧可能
      if (project.status === 'bidding') {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // 添付資料一覧を取得
    const { data: attachments, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select(`
        id,
        file_name,
        file_path,
        file_size,
        file_type,
        uploaded_by,
        created_at,
        users!project_attachments_uploaded_by_fkey (
          display_name
        )
      `)
      .eq('project_id', projectId)
          .order('created_at', { ascending: false })

    if (attachmentsError) {
      console.error('添付資料取得エラー:', attachmentsError)
      return NextResponse.json({ message: '添付資料の取得に失敗しました' }, { status: 500 })
    }

    // 添付資料一覧を返す（Boxファイル対応）
    const attachmentsFormatted = (attachments || []).map((attachment) => {
      // Box file IDを抽出
      const isBoxFile = attachment.file_path && attachment.file_path.startsWith('box://')
      const downloadUrl = isBoxFile
        ? `/api/projects/${projectId}/attachments/${attachment.id}` // Box download endpoint
        : null

      return {
        ...attachment,
        download_url: downloadUrl,
        uploaded_by_name: (attachment.users as any)?.display_name || '不明',
        storage_type: isBoxFile ? 'box' : 'supabase'
      }
    })

    return NextResponse.json({
      attachments: attachmentsFormatted
    })

  } catch (error) {
    console.error('受注者添付資料取得エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
