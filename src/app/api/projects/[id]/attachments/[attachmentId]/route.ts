import { NextRequest, NextResponse } from 'next/server'
import { supabase, createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

// Boxからファイルを削除する関数
async function deleteBoxFile(fileId: string): Promise<void> {
  const { getAppAuthAccessToken } = await import('@/lib/box')
  const accessToken = await getAppAuthAccessToken()

  const res = await fetch(`https://api.box.com/2.0/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  })

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text()
    throw new Error(`Box file deletion failed ${res.status}: ${errorText}`)
  }
}

// 添付資料のダウンロード
export async function GET(request: NextRequest, { params }: { params: { id: string, attachmentId: string } }) {
  try {
    const { id: projectId, attachmentId } = params

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

    // 添付資料の存在確認
    const supabaseAdmin = createSupabaseAdmin()
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('project_attachments')
      .select(`
        id,
        file_name,
        file_path,
        project_id,
        projects!inner (
          org_id
        )
      `)
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json({ message: '添付資料が見つかりません' }, { status: 404 })
    }

    // ユーザーの権限チェック（発注者または受注者）
    // まず発注者の組織メンバーシップをチェック
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', (attachment.projects as any).org_id)
      .single()

    let hasAccess = false

    // 発注者の組織メンバーの場合
    if (membership && ['OrgAdmin', 'Staff'].includes(membership.role)) {
      hasAccess = true
    } else {
      // 受注者の場合は契約をチェック
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('contractor_id', userProfile.id)
        .eq('status', 'signed')
        .single()

      if (contract) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // Boxからファイルをダウンロード
    if (!attachment.file_path || !attachment.file_path.startsWith('box://')) {
      return NextResponse.json({ message: '不正なファイルパスです' }, { status: 400 })
    }

    const boxFileId = attachment.file_path.replace('box://', '')
    const { downloadBoxFile } = await import('@/lib/box')

    const downloadResponse = await downloadBoxFile(boxFileId)
    const fileBuffer = await downloadResponse.arrayBuffer()

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.file_name)}"`,
        'Content-Length': fileBuffer.byteLength.toString()
      }
    })

  } catch (error) {
    console.error('添付資料ダウンロードエラー:', error)
    return NextResponse.json({
      message: 'ファイルダウンロードエラー',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// 添付資料の削除
export async function DELETE(request: NextRequest, { params }: { params: { id: string, attachmentId: string } }) {
  try {
    const { id: projectId, attachmentId } = params

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

    // 添付資料の存在確認（Admin clientを使用）
    const supabaseAdmin = createSupabaseAdmin()
    const { data: attachment, error: attachmentError } = await supabaseAdmin
      .from('project_attachments')
      .select(`
        id,
        file_path,
        project_id,
        projects!inner (
          org_id
        )
      `)
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .single()

    if (attachmentError || !attachment) {
      console.error('❌ 添付資料が見つかりません:', {
        attachmentId,
        projectId,
        error: attachmentError
      })
      return NextResponse.json({ message: '添付資料が見つかりません' }, { status: 404 })
    }

    // ユーザーの権限チェック（発注者または受注者）
    // まず発注者の組織メンバーシップをチェック
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', (attachment.projects as any).org_id)
      .single()

    let hasAccess = false

    // 発注者の組織メンバーの場合
    if (membership && ['OrgAdmin', 'Staff'].includes(membership.role)) {
      hasAccess = true
    } else {
      // 受注者の場合は契約をチェック
      const { data: contract, error: contractError } = await supabaseAdmin
        .from('contracts')
        .select('id, status')
        .eq('project_id', projectId)
        .eq('contractor_id', userProfile.id)
        .eq('status', 'signed')
        .single()

      if (contract) {
        hasAccess = true
      }
    }

    if (!hasAccess) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // Boxからファイルを削除
    if (attachment.file_path && attachment.file_path.startsWith('box://')) {
      const boxFileId = attachment.file_path.replace('box://', '')
      try {
        await deleteBoxFile(boxFileId)
      } catch (storageError: any) {
        console.error('Boxファイル削除エラー:', storageError)
        // Box削除に失敗してもデータベースからは削除を続行
      }
    }

    // データベースから添付資料情報を削除
    const { error: deleteError } = await supabaseAdmin
      .from('project_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('添付資料削除エラー:', deleteError)
      return NextResponse.json({ message: '添付資料の削除に失敗しました' }, { status: 400 })
    }

    return NextResponse.json({ message: '添付資料が正常に削除されました' }, { status: 200 })

  } catch (error) {
    console.error('添付資料削除エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
