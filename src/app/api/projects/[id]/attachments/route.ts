import { NextRequest, NextResponse } from 'next/server'
import { supabase, createSupabaseAdmin } from '@/lib/supabase'

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
      .select('id, org_id, title')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // ユーザーの権限チェック（発注者または受注者）
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // 権限チェック（発注者または受注者）
    if (!['OrgAdmin', 'Contractor'].includes(membership.role)) {
      return NextResponse.json({ message: '添付資料の閲覧権限がありません' }, { status: 403 })
    }

    // Admin clientを使用して添付資料を取得
    const supabaseAdmin = createSupabaseAdmin()
    const { data: attachments, error: attachmentsError } = await supabaseAdmin
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

    return NextResponse.json({ attachments: attachments || [] }, { status: 200 })

  } catch (error) {
    console.error('添付資料取得エラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// 添付資料のアップロード
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const startTime = Date.now()
  
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
      .select('id, org_id, title')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // ユーザーの権限チェック（発注者または受注者）
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ message: 'この案件へのアクセス権限がありません' }, { status: 403 })
    }

    // 権限チェック（発注者または受注者）
    if (!['OrgAdmin', 'Contractor'].includes(membership.role)) {
      return NextResponse.json({ message: 'ファイルアップロードの権限がありません' }, { status: 403 })
    }

    // ファイルアップロード処理（簡易実装）
    const formData = await request.formData()
    
        const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック（200MB制限）
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ message: 'ファイルサイズが大きすぎます（最大200MB）' }, { status: 400 })
    }

    // ファイルタイプチェック
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'application/zip',
      'application/x-rar-compressed',
      // CADファイル形式
      'application/dwg',
      'application/x-dwg',
      'image/vnd.dwg',
      'application/step',
      'application/step+zip',
      'application/octet-stream', // p21, sfc, bfoなどのバイナリファイル
      'application/x-step',
      'application/x-sfc',
      'application/x-bfo'
    ]
    
    // ファイル拡張子もチェック（MIMEタイプが正しく設定されていない場合の対応）
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.dwg', '.p21', '.sfc', '.bfo']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({ 
        message: 'サポートされていないファイル形式です',
        details: `対応形式: PDF, Word, Excel, PowerPoint, 画像, ZIP, RAR, DWG, P21, SFC, BFO。現在のファイル: ${file.name} (${file.type})`
      }, { status: 400 })
    }

    // ファイル名のサニタイズ（日本語文字や特殊文字を安全な文字に変換）
    const sanitizeFileName = (fileName: string) => {
      // ファイル名から拡張子を分離
      const lastDotIndex = fileName.lastIndexOf('.')
      const nameWithoutExt = lastDotIndex > 0 ? fileName.substring(0, lastDotIndex) : fileName
      const extension = lastDotIndex > 0 ? fileName.substring(lastDotIndex) : ''
      
      // 日本語文字や特殊文字を安全な文字に変換
      const sanitizedName = nameWithoutExt
        .replace(/[^\w\-_.]/g, '_') // 英数字、ハイフン、アンダースコア、ドット以外をアンダースコアに変換
        .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
        .replace(/^_|_$/g, '') // 先頭と末尾のアンダースコアを削除
        .substring(0, 100) // ファイル名の長さを制限
      
      return sanitizedName + extension
    }

    // ファイル名の生成（重複回避）
    const timestamp = Date.now()
    const sanitizedFileName = sanitizeFileName(file.name)
    const fileName = `${timestamp}_${sanitizedFileName}`
    const filePath = `projects/${projectId}/${fileName}`

    // バケットの存在確認（Admin clientを使用）
    const supabaseAdmin = createSupabaseAdmin()
    const { data: buckets, error: bucketError } = await supabaseAdmin.storage.listBuckets()
    
    if (bucketError) {
      console.error('バケット一覧取得エラー:', bucketError)
      return NextResponse.json({ 
        message: 'Storageバケットの確認に失敗しました',
        error: bucketError.message
      }, { status: 500 })
    }
    
        const bucketExists = buckets?.some(bucket => bucket.id === 'project-attachments')
    
    if (!bucketExists) {
      console.error('バケットが存在しません:', { 
        requestedBucket: 'project-attachments',
        availableBuckets: buckets?.map(b => b.id)
      })
      return NextResponse.json({ 
        message: 'Storageバケット "project-attachments" が存在しません',
        error: 'Bucket not found',
        details: `利用可能なバケット: ${buckets?.map(b => b.id).join(', ') || 'なし'}`
      }, { status: 404 })
    }

        // Supabase Storageにファイルをアップロード（Admin clientを使用）

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('project-attachments')
      .upload(filePath, file)

    if (uploadError) {
      console.error('ファイルアップロードエラー:', {
        error: uploadError,
        filePath,
        fileName: file.name,
        fileSize: file.size,
        errorCode: (uploadError as any).statusCode || 'UNKNOWN',
        errorMessage: uploadError.message
      })
      return NextResponse.json({ 
        message: 'ファイルのアップロードに失敗しました',
        error: uploadError.message,
        details: `エラーコード: ${(uploadError as any).statusCode || 'Unknown'}, バケット: project-attachments`
      }, { status: 400 })
    }


    // データベースに添付資料情報を保存

    const { data: attachmentData, error: attachmentError } = await supabaseAdmin
      .from('project_attachments')
      .insert({
        project_id: projectId,
        file_name: file.name, // 元のファイル名を保存
        file_path: filePath, // サニタイズされたファイルパス
        file_size: file.size,
        file_type: file.type,
        uploaded_by: userProfile.id
      })
      .select()
      .single()

    if (attachmentError) {
      console.error('添付資料保存エラー:', {
        error: attachmentError,
        project_id: projectId,
        uploaded_by: userProfile.id
      })
      // アップロードしたファイルを削除
      await supabaseAdmin.storage.from('project-attachments').remove([filePath])
      return NextResponse.json({ 
        message: '添付資料の保存に失敗しました',
        error: attachmentError.message,
        details: 'project_attachmentsテーブルが存在しないか、アクセス権限がありません'
      }, { status: 400 })
    }


    const endTime = Date.now()
        const duration = endTime - startTime

    return NextResponse.json({
      message: 'ファイルが正常にアップロードされました',
      attachment: attachmentData
    }, { status: 201 })

  } catch (error) {
    const endTime = Date.now()
    const duration = endTime - startTime
    console.error('=== ファイルアップロードエラー ===', { 
      error: error,
      duration: `${duration}ms`,
      projectId: params.id,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: `${duration}ms`
    }, { status: 500 })
  }
}
