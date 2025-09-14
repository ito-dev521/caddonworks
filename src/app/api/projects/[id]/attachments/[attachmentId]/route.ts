import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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

    // 添付資料の存在確認と権限チェック
    const { data: attachment, error: attachmentError } = await supabase
      .from('project_attachments')
      .select(`
        id,
        file_path,
        project_id,
        projects!inner (
          org_id,
          memberships!inner (
            user_id,
            role
          )
        )
      `)
      .eq('id', attachmentId)
      .eq('project_id', projectId)
      .eq('projects.memberships.user_id', user.id)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json({ message: '添付資料が見つからないか、削除権限がありません' }, { status: 404 })
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
