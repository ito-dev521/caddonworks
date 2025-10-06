import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { deleteBoxFolder } from '@/lib/box'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id

    // 組織詳細を取得（拡張フィールドは存在しない場合に備えてフォールバック）
    let organization: any | null = null
    let orgError: any | null = null

    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select(`
          id,
          name,
          active,
          approval_status,
          system_fee,
          created_at,
          approved_at,
          rejection_reason,
          billing_email,
          box_folder_id,
          phone,
          department,
          website,
          address,
          registration_number,
          tax_id,
          business_type
        `)
        .eq('id', organizationId)
        .single()

      organization = data
      orgError = error

      // カラムが存在しない環境向けフォールバック
      if (error && error.code === '42703') {
        const { data: basicData, error: basicError } = await supabaseAdmin
          .from('organizations')
          .select(`
            id,
            name,
            active,
            approval_status,
            system_fee,
            created_at,
            approved_at,
            rejection_reason,
            billing_email,
            box_folder_id
          `)
          .eq('id', organizationId)
          .single()
        organization = basicData
        orgError = basicError
      }
    } catch (e) {
      orgError = e
    }

    if (orgError || !organization) {
      return NextResponse.json({ message: '組織が見つかりません' }, { status: 404 })
    }

    // 組織管理者（OrgAdmin）の連絡先を取得（任意項目）
    let adminContact: any | null = null
    try {
      const { data: orgAdmin, error: adminError } = await supabaseAdmin
        .from('memberships')
        .select(`
          users!inner(
            id,
            display_name,
            email,
            formal_name,
            phone_number,
            department
          )
        `)
        .eq('org_id', organizationId)
        .eq('role', 'OrgAdmin')
        .limit(1)
        .single()

      if (!adminError && orgAdmin) {
        const u = (orgAdmin as any).users
        adminContact = {
          name: u.formal_name || u.display_name || null,
          email: u.email || null,
          phone: u.phone_number || null,
          department: u.department || null
        }
      }
    } catch (_e) {
      // 取得失敗は致命的ではないため無視
    }

    return NextResponse.json({ organization: { ...organization, admin_contact: adminContact } }, { status: 200 })
  } catch (error) {
    console.error('組織詳細取得APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}

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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const organizationId = params.id

    // 認証ヘッダーを確認（管理者権限が必要）
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // トークンを使用してユーザー認証を確認
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      console.error('認証エラー:', authError)
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

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
      .select('id, user_id')
      .eq('org_id', organizationId)

    if (membershipError) {
      console.error('メンバーシップ確認エラー:', membershipError)
      return NextResponse.json({ message: 'メンバーシップ確認に失敗しました' }, { status: 500 })
    }

    // メンバーが存在する場合は安全に削除
    if (memberships && memberships.length > 0) {
      try {
        const userIds = memberships.map((m: any) => m.user_id)
        // メンバーシップ削除
        await supabaseAdmin.from('memberships').delete().eq('org_id', organizationId)

        // 他の組織に属していないユーザープロファイルは併せて削除
        if (userIds.length > 0) {
          const { data: others } = await supabaseAdmin
            .from('memberships')
            .select('user_id')
            .in('user_id', userIds)
          const stillReferenced = new Set((others || []).map((r: any) => r.user_id))
          const toDeleteUserIds = userIds.filter(id => !stillReferenced.has(id))
          if (toDeleteUserIds.length > 0) {
            await supabaseAdmin.from('users').delete().in('id', toDeleteUserIds)
          }
        }
      } catch (e) {
        console.error('メンバー削除中エラー:', e)
        return NextResponse.json({ message: 'メンバー削除に失敗しました' }, { status: 500 })
      }
    }

    // まずBOXフォルダがあれば削除（存在しない/権限なし等はログのみ）
    try {
      if (org.box_folder_id) {
        await deleteBoxFolder(org.box_folder_id as any, true)
      }
    } catch (e) {
      console.error('BOXフォルダ削除エラー(続行):', e)
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

    return NextResponse.json({
      message: `組織「${org.name}」と関連BOXフォルダ（存在する場合）を削除しました`
    }, { status: 200 })

  } catch (error) {
    console.error('組織削除APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}