import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  try {
    const projectId = params.id
    if (!projectId) return NextResponse.json({ message: '案件IDが必要です' }, { status: 400 })

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .eq('id', projectId)
      .single()

    if (error) return NextResponse.json({ message: 'プロジェクト取得エラー', error: String(error.message || error) }, { status: 500 })
    if (!project) return NextResponse.json({ message: '案件が見つかりません' }, { status: 404 })

    if (project.box_folder_id) return NextResponse.json({ folderId: project.box_folder_id }, { status: 200 })

    const parentId = process.env.BOX_PROJECTS_ROOT_FOLDER_ID
    if (!parentId) return NextResponse.json({ message: 'BOX_PROJECTS_ROOT_FOLDER_ID が未設定です' }, { status: 500 })

    const name = `[PRJ-${project.id.slice(0, 8)}] ${project.title}`

    // Box API専用ルートに委譲
    const boxResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/provision`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, parentId })
    })

    if (!boxResponse.ok) {
      const boxError = await boxResponse.json()
      return NextResponse.json({
        message: 'Boxフォルダ作成エラー',
        error: boxError.error || boxError.message
      }, { status: boxResponse.status })
    }

    const { folderId } = await boxResponse.json()

    // DB更新
    const { error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ box_folder_id: folderId })
      .eq('id', project.id)

    if (updateError) {
      const msg = String(updateError.message || updateError)
      if (msg.includes('box_folder_id')) {
        return NextResponse.json({
          message: 'projects.box_folder_id カラムが存在しません。DBにカラムを追加してください。',
          hint_sql: "ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS box_folder_id text;"
        }, { status: 500 })
      }
      return NextResponse.json({ message: 'projects 更新エラー', error: msg }, { status: 500 })
    }

    return NextResponse.json({ folderId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ message: 'サーバーエラー', error: String(e?.message || e) }, { status: 500 })
  }
}
