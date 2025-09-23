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
    

    // orgadmin2@demo.com のユーザーと組織を取得
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        memberships!inner (
          org_id,
          role
        )
      `)
      .eq('email', 'orgadmin2@demo.com')
      .eq('memberships.role', 'OrgAdmin')
      .single()

    if (userError || !user) {
      return NextResponse.json({
        message: 'orgadmin2@demo.com ユーザーが見つかりません',
        error: userError?.message
      }, { status: 404 })
    }

    const orgId = (user.memberships as any)[0].org_id
    

    // 既存のBOXフォルダ付きプロジェクトを確認
    const { data: existingProjects } = await supabaseAdmin
      .from('projects')
      .select('id, title, box_folder_id')
      .eq('org_id', orgId)
      .not('box_folder_id', 'is', null)

    

    // テストプロジェクトを作成（BOXフォルダID付き）
    const { data: newProject, error: projectError } = await supabaseAdmin
      .from('projects')
      .insert({
        title: 'デモ2組織 - ファイル管理テスト案件',
        description: 'ファイル管理機能のテスト用プロジェクト',
        org_id: orgId,
        status: 'bidding', // BOX連携されている状態
        box_folder_id: '342120071668' // 既存のテストフォルダID
      })
      .select()
      .single()

    if (projectError) {
      return NextResponse.json({
        message: 'テストプロジェクト作成に失敗しました',
        error: projectError.message
      }, { status: 500 })
    }

    

    return NextResponse.json({
      message: 'orgadmin2@demo.com の組織にBOXテストプロジェクトを作成しました',
      user: {
        id: user.id,
        email: user.email,
        org_id: orgId
      },
      project: {
        id: newProject.id,
        title: newProject.title,
        box_folder_id: newProject.box_folder_id,
        status: newProject.status
      },
      existing_box_projects: existingProjects?.length || 0
    }, { status: 201 })

  } catch (error: any) {
    console.error('❌ Setup error:', error)
    return NextResponse.json({
      message: 'セットアップに失敗しました',
      error: error.message
    }, { status: 500 })
  }
}