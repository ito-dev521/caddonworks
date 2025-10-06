import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

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

    // 添付資料の存在確認
    const { data: attachment, error: attachmentError } = await supabase
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
      return NextResponse.json({ message: '添付資料が見つかりません' }, { status: 404 })
    }

    // ユーザーの権限チェック（発注者または受注者）
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', (attachment.projects as any).org_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // 権限チェック（発注者または受注者）
    if (!['OrgAdmin', 'Staff', 'Contractor'].includes(membership.role)) {
      return NextResponse.json({ message: '添付資料の削除権限がありません' }, { status: 403 })
    }

    // Supabase Storageからファイルを削除
    const { error: storageError } = await supabase.storage
      .from('project-attachments')
      .remove([attachment.file_path])

    if (storageError) {
      console.error('ファイル削除エラー:', storageError)
      // ストレージの削除に失敗してもデータベースからは削除を続行
    }

    // データベースから添付資料情報を削除
    const { error: deleteError } = await supabase
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
