export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBoxFolderItems } from '@/lib/box'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)


export async function GET(request: NextRequest, { params }: { params: { folderId: string } }) {
  try {
    
    // Authorizationヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({
        message: '認証に失敗しました',
        error: authError?.message
      }, { status: 401 })
    }

    
    // モックフォルダIDの場合はモックデータを返す（すべての発注者で統一）
    if (params.folderId.startsWith('mock_') || params.folderId.startsWith('pending_')) {
      const now = new Date()
      const mockItems = [
        {
          id: 'mock_file_1',
          name: '施工図面_最新版.dwg',
          type: 'file',
          size: 2048000,
          modified_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2時間前
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3日前
          path_collection: { entries: [{ name: 'テストフォルダ' }] }
        },
        {
          id: 'mock_file_2',
          name: '変更契約書_v2.pdf',
          type: 'file',
          size: 820000,
          modified_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30分前
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1日前
          path_collection: { entries: [{ name: 'テストフォルダ' }] }
        },
        {
          id: 'mock_file_3',
          name: '進捗写真_20250921.jpg',
          type: 'file',
          size: 1536000,
          modified_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6時間前
          created_at: new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString(), // 6時間前
          path_collection: { entries: [{ name: 'テストフォルダ' }] }
        },
        {
          id: 'mock_file_4',
          name: '仕様書_改訂版.docx',
          type: 'file',
          size: 450000,
          modified_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1日前
          created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5日前
          path_collection: { entries: [{ name: 'テストフォルダ' }] }
        },
        {
          id: 'mock_folder_sub',
          name: 'サブフォルダ',
          type: 'folder',
          modified_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString(), // 12時間前
          created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7日前
          path_collection: { entries: [{ name: 'テストフォルダ' }] }
        }
      ]

      return NextResponse.json({
        items: mockItems,
        folder_id: params.folderId
      }, { status: 200 })
    }

    // 実際のBOXフォルダの内容を取得
    const items = await getBoxFolderItems(params.folderId)

    
    return NextResponse.json({
      items: items,
      folder_id: params.folderId
    }, { status: 200 })

  } catch (e: any) {
    console.error('Box folder API error:', e)
    return NextResponse.json({
      message: 'BOXフォルダ取得エラー',
      error: String(e?.message || e)
    }, { status: 500 })
  }
}