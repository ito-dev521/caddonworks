import { NextRequest, NextResponse } from 'next/server'
import { supabase, createSupabaseAdmin } from '@/lib/supabase'
import { uploadFileToBox, getBoxFolderItems } from '@/lib/box'

export const dynamic = 'force-dynamic'

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
    // まず発注者の組織メンバーシップをチェック
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
      .single()

    // Admin clientを使用
    const supabaseAdmin = createSupabaseAdmin()
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

    // Admin clientを使用して添付資料を取得
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

    // ファイル名とファイルパスが同じものを重複排除（最新のもののみ残す）
    const uniqueAttachments = (attachments || []).reduce((acc: any[], current: any) => {
      const duplicate = acc.find((item: any) =>
        item.file_name === current.file_name && item.file_path === current.file_path
      )
      if (!duplicate) {
        acc.push(current)
      }
      return acc
    }, [])

    return NextResponse.json({ attachments: uniqueAttachments }, { status: 200 })

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

    // Admin clientを作成
    const supabaseAdmin = createSupabaseAdmin()

    // 案件の存在確認（Box情報も取得）
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, org_id, title, box_folder_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      console.error('❌ 案件が見つかりません:', {
        projectId,
        error: projectError
      })
      return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })
    }

    // Box設定の確認
    if (!project.box_folder_id) {
      console.error('❌ box_folder_idが設定されていません:', project.id)
      return NextResponse.json({
        message: 'この案件はまだBoxフォルダが設定されていません',
        details: 'プロジェクトにbox_folder_idが設定されていません。案件を承認してBoxフォルダを作成してください。'
      }, { status: 400 })
    }

    // Boxフォルダからサブフォルダを取得
    let items: any[]
    try {
      items = await getBoxFolderItems(project.box_folder_id)
    } catch (boxError: any) {
      console.error('❌ Boxフォルダアイテム取得エラー:', boxError)
      return NextResponse.json({
        message: 'Boxフォルダへのアクセスに失敗しました',
        error: boxError.message
      }, { status: 500 })
    }

    // サブフォルダを特定
    const folderMapping: Record<string, string[]> = {
      '作業内容': ['00_作業内容', '作業内容', '00_'],
      '受取': ['01_受取データ', '受取', '01_受取', '01_'],
      '作業': ['02_作業フォルダ', '作業', '02_作業', '02_'],
      '納品': ['03_納品データ', '納品', '03_納品', '03_'],
      '契約': ['04_契約資料', '契約', '04_契約', '04_']
    }

    const subfolders: Record<string, string> = {}
    items.forEach(item => {
      if (item.type === 'folder') {
        const itemName = item.name
        Object.entries(folderMapping).forEach(([category, patterns]) => {
          patterns.forEach(pattern => {
            if (itemName.includes(pattern) && !subfolders[category]) {
              subfolders[category] = item.id
            }
          })
        })
      }
    })

    // 作業内容フォルダIDを取得
    let workContentFolderId = subfolders['作業内容']

    // 作業内容フォルダが存在しない場合は作成
    if (!workContentFolderId) {
      try {
        const { ensureProjectFolder } = await import('@/lib/box')
        const folderResult = await ensureProjectFolder({
          name: '00_作業内容',
          parentFolderId: project.box_folder_id
        })
        workContentFolderId = folderResult.id
      } catch (createError: any) {
        console.error('❌ 作業内容フォルダの作成に失敗:', createError)
        return NextResponse.json({
          message: '作業内容フォルダの作成に失敗しました',
          error: createError.message
        }, { status: 500 })
      }
    }

    // ユーザーの権限チェック（発注者または受注者）
    // まず発注者の組織メンバーシップをチェック
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', userProfile.id)
      .eq('org_id', project.org_id)
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

    // ファイルアップロード処理
    const formData = await request.formData()

    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ message: 'ファイルが選択されていません' }, { status: 400 })
    }

    // ファイルサイズチェック（15GB制限 - Box Business Plusプラン）
    if (file.size > 15 * 1024 * 1024 * 1024) {
      return NextResponse.json({ message: 'ファイルサイズが大きすぎます（最大15GB）' }, { status: 400 })
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
      'application/x-bfo',
      // 動画形式
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-ms-wmv',
      'video/x-flv',
      'video/x-matroska',
      'video/webm'
    ]

    // ファイル拡張子もチェック（MIMEタイプが正しく設定されていない場合の対応）
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.zip', '.rar', '.dwg', '.p21', '.sfc', '.bfo', '.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm']
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      return NextResponse.json({
        message: 'サポートされていないファイル形式です',
        details: `対応形式: PDF, Word, Excel, PowerPoint, 画像, 動画, ZIP, RAR, DWG, P21, SFC, BFO。現在のファイル: ${file.name} (${file.type})`
      }, { status: 400 })
    }

    // ファイルをArrayBufferに変換
    const arrayBuffer = await file.arrayBuffer()

    // Boxの作業内容フォルダにアップロード
    let boxFileId: string
    try {
      boxFileId = await uploadFileToBox(arrayBuffer, file.name, workContentFolderId)
    } catch (uploadError: any) {
      console.error('Boxアップロードエラー:', uploadError)
      return NextResponse.json({
        message: 'Boxへのファイルアップロードに失敗しました',
        error: uploadError.message
      }, { status: 500 })
    }

    // データベースに添付資料情報を保存
    const { data: attachmentData, error: attachmentError } = await supabaseAdmin
      .from('project_attachments')
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_path: `box://${boxFileId}`, // Box file IDを保存
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
      return NextResponse.json({
        message: '添付資料の保存に失敗しました',
        error: attachmentError.message
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
