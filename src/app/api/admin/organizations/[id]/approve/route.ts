import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id

    // 組織を取得
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()

    if (orgError || !organization) {
      return NextResponse.json(
        { message: '組織が見つかりません' },
        { status: 404 }
      )
    }

    // 組織を承認状態に更新
    const { error: updateError } = await supabaseAdmin
      .from('organizations')
      .update({
        approval_status: 'approved',
        approved_at: new Date().toISOString(),
        active: true // 承認時に自動的にアクティブ化
      })
      .eq('id', organizationId)

    if (updateError) {
      console.error('Organization approval error:', updateError)
      return NextResponse.json(
        { message: '組織の承認に失敗しました', error: updateError.message },
        { status: 500 }
      )
    }

    // BOXフォルダを作成（エラーが発生しても承認処理は継続）
    try {
      const companyFolderResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/box/company-folder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName: organization.name })
      })

      if (companyFolderResponse.ok) {
        const { folderId: companyFolderId } = await companyFolderResponse.json()

        // BOXフォルダIDを組織に保存
        await supabaseAdmin
          .from('organizations')
          .update({ box_folder_id: companyFolderId })
          .eq('id', organizationId)

        return NextResponse.json({
          message: '組織を承認し、BOXフォルダを作成しました',
          boxFolderId: companyFolderId
        }, { status: 200 })
      } else {
        console.warn('BOXフォルダ作成に失敗しましたが、承認処理は継続します')
        return NextResponse.json({
          message: '組織を承認しました（BOXフォルダ作成は失敗）'
        }, { status: 200 })
      }
    } catch (boxError) {
      console.warn('BOXフォルダ作成でエラーが発生しましたが、承認処理は継続します:', boxError)
      return NextResponse.json({
        message: '組織を承認しました（BOXフォルダ作成は失敗）'
      }, { status: 200 })
    }

  } catch (error) {
    console.error('組織承認APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}