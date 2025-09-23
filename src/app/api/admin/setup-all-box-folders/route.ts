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
    

    // BOXフォルダIDがnullのすべてのプロジェクトを取得
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('id, title, org_id, status')
      .is('box_folder_id', null)
      .not('status', 'eq', 'draft')

    if (projectsError) {
      return NextResponse.json({
        message: 'プロジェクト取得に失敗しました',
        error: projectsError.message
      }, { status: 500 })
    }

    

    if (!projects || projects.length === 0) {
      return NextResponse.json({
        message: 'BOXフォルダが未設定のプロジェクトはありません',
        updated_projects: 0
      }, { status: 200 })
    }

    const updated = []
    const failed = []

    // 各プロジェクトにテストBOXフォルダIDを設定（承認待ち期間中）
    for (const project of projects) {
      try {
        // 承認が下りるまでは既存のテストフォルダIDを使用
        const testFolderId = '342120071668'

        const { error: updateError } = await supabaseAdmin
          .from('projects')
          .update({
            box_folder_id: testFolderId
          })
          .eq('id', project.id)

        if (updateError) {
          failed.push({
            project_id: project.id,
            title: project.title,
            error: updateError.message
          })
        } else {
          updated.push({
            project_id: project.id,
            title: project.title,
            box_folder_id: testFolderId
          })
          
        }
      } catch (error: any) {
        failed.push({
          project_id: project.id,
          title: project.title,
          error: error.message
        })
      }
    }

    return NextResponse.json({
      message: `${updated.length}件のプロジェクトにBOXフォルダを設定しました`,
      updated_projects: updated.length,
      failed_projects: failed.length,
      updated,
      failed
    }, { status: 200 })

  } catch (error: any) {
    console.error('❌ Setup error:', error)
    return NextResponse.json({
      message: 'BOXフォルダ一括設定に失敗しました',
      error: error.message
    }, { status: 500 })
  }
}