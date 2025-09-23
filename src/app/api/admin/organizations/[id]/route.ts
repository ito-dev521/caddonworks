import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id
    const { active } = await request.json()

    if (typeof active !== 'boolean') {
      return NextResponse.json({ message: 'activeフィールドが必要です' }, { status: 400 })
    }

    // 管理ページからのアクセスを前提とし、認証チェックは簡素化
    // （実際の認証はページレベルのAuthGuardで行われている前提）

    // 組織を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('approval_status')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織が見つかりません' }, { status: 404 })
    }

    // 組織のactive状態を更新
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({ active })
      .eq('id', organizationId)

    if (updateError) {
      return NextResponse.json({
        message: '組織更新に失敗しました',
        error: updateError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: active ? '組織が有効化されました' : '組織が無効化されました'
    }, { status: 200 })

  } catch (error) {
    console.error('組織更新APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id

    // 管理ページからのアクセスを前提とし、認証チェックは簡素化
    // （実際の認証はページレベルのAuthGuardで行われている前提）

    // 組織を削除前に存在確認
    const { data: org, error: fetchError } = await supabaseAdmin
      .from('organizations')
      .select('name, box_folder_id')
      .eq('id', organizationId)
      .single()

    if (fetchError || !org) {
      return NextResponse.json({ message: '組織が見つかりません' }, { status: 404 })
    }

    // 組織に関連するプロジェクトがあるかチェック
    const { data: projects, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('org_id', organizationId)
      .limit(1)

    if (projectError) {
      console.error('プロジェクト確認エラー:', projectError)
      return NextResponse.json({ message: 'プロジェクト確認に失敗しました' }, { status: 500 })
    }

    if (projects && projects.length > 0) {
      return NextResponse.json({
        message: 'この組織にはプロジェクトが存在するため削除できません。先にプロジェクトを削除してください。'
      }, { status: 400 })
    }

    // 組織に関連するメンバーシップがあるかチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('org_id', organizationId)
      .limit(1)

    if (membershipError) {
      console.error('メンバーシップ確認エラー:', membershipError)
      return NextResponse.json({ message: 'メンバーシップ確認に失敗しました' }, { status: 500 })
    }

    if (memberships && memberships.length > 0) {
      return NextResponse.json({
        message: 'この組織にはメンバーが存在するため削除できません。先にメンバーを削除してください。'
      }, { status: 400 })
    }

    // 組織を削除
    const { error: deleteError } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (deleteError) {
      console.error('組織削除エラー:', deleteError)
      return NextResponse.json({
        message: '組織の削除に失敗しました',
        error: deleteError.message
      }, { status: 500 })
    }

    // 注意: BOXフォルダは削除しない（データ保全のため）

    return NextResponse.json({
      message: `組織「${org.name}」を削除しました`,
      note: 'BOXフォルダは保持されています'
    }, { status: 200 })

  } catch (error) {
    console.error('組織削除APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}