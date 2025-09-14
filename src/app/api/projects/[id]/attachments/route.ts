import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// 添付資料の一覧取得
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

    // 案件の添付資料を取得
    const { data: attachments, error: attachmentsError } = await supabase
      .from('project_attachments')
      .select(`
        id,
        file_name,
        file_path,
        file_size,
        file_type,
        created_at,
        uploaded_by,
        uploader:users!project_attachments_uploaded_by_fkey (
          display_name
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    if (attachmentsError) {
      console.error('添付資料の取得に失敗:', attachmentsError)
      return NextResponse.json({ message: '添付資料の取得に失敗しました' }, { status: 400 })
    }

    return NextResponse.json({ attachments }, { status: 200 })

  } catch (error) {
    console.error('添付資料取得エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// 添付資料のアップロード
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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

    // 案件の存在確認と権限チェック
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`
        id,
        org_id,
        memberships!inner (
          user_id,
          role
        )
      `)
      .eq('id', projectId)
      .eq('memberships.user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つからないか、アクセス権限がありません' }, { status: 404 })
    }

    // ファイルアップロード処理（簡易実装）
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ message: 'ファイルサイズが大きすぎます（10MB以下）' }, { status: 400 })
    }

    // ファイルタイプチェック
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ message: 'サポートされていないファイル形式です' }, { status: 400 })
    }

    // ファイル名の生成（重複回避）
    const timestamp = Date.now()
    const fileName = `${timestamp}_${file.name}`
    const filePath = `projects/${projectId}/${fileName}`

    // Supabase Storageにファイルをアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-attachments')
      .upload(filePath, file)

    if (uploadError) {
      console.error('ファイルアップロードエラー:', uploadError)
      return NextResponse.json({ message: 'ファイルのアップロードに失敗しました' }, { status: 400 })
    }

    // データベースに添付資料情報を保存
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('project_attachments')
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('添付資料保存エラー:', attachmentError)
      // アップロードしたファイルを削除
      await supabase.storage.from('project-attachments').remove([filePath])
      return NextResponse.json({ message: '添付資料の保存に失敗しました' }, { status: 400 })
    }

    return NextResponse.json({
      message: 'ファイルが正常にアップロードされました',
      attachment: attachmentData
    }, { status: 201 })

  } catch (error) {
    console.error('ファイルアップロードエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
