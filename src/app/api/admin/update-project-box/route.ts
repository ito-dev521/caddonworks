export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const { projectId, boxFolderId } = await request.json()

    console.log(`🔄 Updating project ${projectId} with BOX folder ID: ${boxFolderId}`)

    const { data, error } = await supabaseAdmin
      .from('projects')
      .update({
        box_folder_id: boxFolderId
      })
      .eq('id', projectId)
      .select('id, title, box_folder_id')

    if (error) {
      return NextResponse.json({
        message: 'プロジェクト更新に失敗しました',
        error: error.message
      }, { status: 500 })
    }

    console.log('✅ Project updated successfully:', data)

    return NextResponse.json({
      message: 'BOXフォルダIDが正常に設定されました',
      project: data[0]
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Update error:', error)
    return NextResponse.json({
      message: 'サーバーエラー',
      error: error.message
    }, { status: 500 })
  }
}