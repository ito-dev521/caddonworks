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