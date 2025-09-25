import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

type OperatorRole = 'Admin' | 'Reviewer' | 'Auditor'

async function assertAdminAndGetOperatorOrgId(request: NextRequest) {
  const supabaseAdmin = createSupabaseAdmin()
  const authHeader = request.headers.get('authorization')
  if (!authHeader) {
    return { error: NextResponse.json({ message: '認証が必要です' }, { status: 401 }) }
  }
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return { error: NextResponse.json({ message: '認証に失敗しました' }, { status: 401 }) }
  }

  const { data: userProfile } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
  const isEmailAdmin = !!user.email && adminEmails.includes(user.email.toLowerCase())

  // 自分が所属する運営組織ID（Adminのmembership）を取得
  const userIdCandidates = [userProfile?.id, user.id].filter(Boolean) as string[]
  let operatorOrgId: string | null = null
  for (const candidate of userIdCandidates) {
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('org_id, role')
      .eq('user_id', candidate)
      .eq('role', 'Admin')
      .maybeSingle()
    if (membership?.org_id) {
      operatorOrgId = membership.org_id
      break
    }
  }

  if (!isEmailAdmin && !operatorOrgId) {
    return { error: NextResponse.json({ message: '管理者権限が必要です' }, { status: 403 }) }
  }

  return { supabaseAdmin, operatorOrgId }
}

// 運営者（Admin/Reviewer/Auditor）の一覧を取得
export async function GET(request: NextRequest) {
  try {
    const ctx = await assertAdminAndGetOperatorOrgId(request)
    if ('error' in ctx) return ctx.error
    const { supabaseAdmin, operatorOrgId } = ctx

    const roles: OperatorRole[] = ['Admin', 'Reviewer', 'Auditor']

    // 運営組織IDを確実に取得する
    let finalOperatorOrgId = operatorOrgId

    if (!finalOperatorOrgId) {
      // デフォルト運営組織を探す
      const { data: operatorOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('name', '運営会社')
        .single()

      finalOperatorOrgId = operatorOrg?.id
    }

    const query = supabaseAdmin
      .from('memberships')
      .select(`
        id,
        role,
        org_id,
        users:users!inner(
          id,
          email,
          display_name,
          formal_name,
          phone_number,
          address,
          member_level,
          created_at,
          updated_at
        ),
        organizations!inner(
          id,
          name
        )
      `)
      .in('role', roles)

    // 運営組織IDがある場合は必ず絞り込む
    if (finalOperatorOrgId) {
      query.eq('org_id', finalOperatorOrgId)
    } else {
      // 運営組織が見つからない場合は運営組織名で絞り込む
      query.eq('organizations.name', '運営会社')
    }

    const { data: rows, error } = await query
    if (error) {
      console.error('ユーザー一覧取得エラー:', error)
      return NextResponse.json({ message: 'ユーザー一覧の取得に失敗しました' }, { status: 400 })
    }

    const users = (rows || []).map((row: any) => ({ ...row.users, role: row.role }))
    return NextResponse.json({ users }, { status: 200 })
  } catch (error) {
    console.error('admin users API: サーバーエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') }, { status: 500 })
  }
}

// 追加・編集・削除（運営会社スタッフ専用）
export async function POST(request: NextRequest) {
  try {
    console.log('=== 運営ユーザー作成API開始 ===')
    const ctx = await assertAdminAndGetOperatorOrgId(request)
    if ('error' in ctx) {
      console.log('管理者権限チェック失敗')
      return ctx.error
    }
    const { supabaseAdmin, operatorOrgId } = ctx

    console.log('運営ユーザー作成: operatorOrgId =', operatorOrgId)

    const body = await request.json()
    const { email, displayName, role }: { email?: string; displayName?: string; role?: OperatorRole } = body
    console.log('運営ユーザー作成リクエスト:', { email, displayName, role })
    
    if (!email || !role) {
      return NextResponse.json({ message: 'email と role は必須です' }, { status: 400 })
    }

    // operatorOrgIdがnullの場合はデフォルトの運営組織を作成または取得
    let finalOperatorOrgId = operatorOrgId
    if (!finalOperatorOrgId) {
      console.log('運営組織IDが見つからないため、デフォルト組織を作成/取得します')
      const { data: defaultOrg } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('name', '運営会社')
        .maybeSingle()
      
      if (defaultOrg) {
        finalOperatorOrgId = defaultOrg.id
        console.log('既存の運営組織を使用:', finalOperatorOrgId)
      } else {
        // デフォルト運営組織を作成
        const { data: newOrg, error: createOrgError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: '運営会社',
            email: 'admin@caddon.jp',
            status: 'approved'
          })
          .select('id')
          .single()
        
        if (createOrgError || !newOrg) {
          console.error('運営組織作成エラー:', createOrgError)
          return NextResponse.json({ message: '運営組織の作成に失敗しました' }, { status: 500 })
        }
        
        finalOperatorOrgId = newOrg.id
        console.log('新しい運営組織を作成:', finalOperatorOrgId)
      }
    }

    // 既存ユーザーのチェック
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('email', email.toLowerCase())
      .maybeSingle()

    if (existingUser) {
      return NextResponse.json({
        message: 'このメールアドレスは既に登録されています'
      }, { status: 400 })
    }

    // 認証ユーザー作成（確認メールを送付）
    const { data: created, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: false
    })
    if (authErr) {
      console.error('認証ユーザー作成エラー:', authErr)
      return NextResponse.json({ message: '認証ユーザー作成に失敗しました: ' + authErr.message }, { status: 400 })
    }
    if (!created?.user?.id) {
      console.error('認証ユーザーIDが取得できませんでした:', created)
      return NextResponse.json({ message: '認証ユーザーの作成に失敗しました' }, { status: 400 })
    }
    const authUserId = created.user.id

    // users プロフィール作成
    const { data: profile, error: profileErr } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: authUserId,
        email,
        display_name: displayName || '運営者',
        specialties: [],
        qualifications: []
      })
      .select()
      .single()
    if (profileErr) {
      // rollback auth user
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ message: 'ユーザープロフィール作成に失敗しました' }, { status: 400 })
    }

    // 運営組織のmembershipを付与
    console.log('メンバーシップ作成:', { user_id: profile.id, org_id: finalOperatorOrgId, role })
    const { error: memErr } = await supabaseAdmin
      .from('memberships')
      .insert({ user_id: profile.id, org_id: finalOperatorOrgId, role })
    if (memErr) {
      console.error('メンバーシップ作成エラー:', memErr)
      await supabaseAdmin.from('users').delete().eq('id', profile.id)
      await supabaseAdmin.auth.admin.deleteUser(authUserId)
      return NextResponse.json({ message: '権限付与に失敗しました: ' + memErr.message }, { status: 400 })
    }

    // 初回セットアップ用にパスワードリセットメールを送付
    const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`
    await supabaseAdmin.auth.resetPasswordForEmail(email, { redirectTo })

    return NextResponse.json({ message: '運営ユーザーを作成しました', user: { id: profile.id, email, display_name: profile.display_name, role } }, { status: 200 })
  } catch (error) {
    console.error('=== 運営ユーザー作成API: サーバーエラー ===', error)
    console.error('エラーの詳細:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.json({
      message: 'サーバーエラーが発生しました',
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const ctx = await assertAdminAndGetOperatorOrgId(request)
    if ('error' in ctx) return ctx.error
    const { supabaseAdmin, operatorOrgId } = ctx

    const body = await request.json()
    const { userId, displayName, role, memberLevel } = body as {
      userId?: string;
      displayName?: string;
      role?: OperatorRole;
      memberLevel?: 'beginner' | 'intermediate' | 'advanced'
    }

    console.log('ユーザー更新リクエスト:', { userId, displayName, role, memberLevel })

    if (!userId) {
      return NextResponse.json({ message: 'userId は必須です' }, { status: 400 })
    }

    // まず対象が運営組織のメンバーであることを確認
    const { data: targetMembership } = await supabaseAdmin
      .from('memberships')
      .select('id, org_id, role')
      .eq('user_id', userId)
      .maybeSingle()
    if (!targetMembership || (operatorOrgId && targetMembership.org_id !== operatorOrgId)) {
      return NextResponse.json({ message: '運営ユーザーではありません' }, { status: 403 })
    }

    // ユーザー情報の更新
    const userUpdates: any = {}
    if (displayName) {
      userUpdates.display_name = displayName
    }
    if (memberLevel) {
      userUpdates.member_level = memberLevel
    }

    if (Object.keys(userUpdates).length > 0) {
      userUpdates.updated_at = new Date().toISOString()

      const { error: userUpdateError } = await supabaseAdmin
        .from('users')
        .update(userUpdates)
        .eq('id', userId)

      if (userUpdateError) {
        console.error('ユーザー更新エラー:', userUpdateError)
        return NextResponse.json({ message: 'ユーザー情報の更新に失敗しました' }, { status: 500 })
      }
    }

    // メンバーシップの更新
    if (role) {
      const { error: membershipUpdateError } = await supabaseAdmin
        .from('memberships')
        .update({ role })
        .eq('id', targetMembership.id)

      if (membershipUpdateError) {
        console.error('メンバーシップ更新エラー:', membershipUpdateError)
        return NextResponse.json({ message: '権限の更新に失敗しました' }, { status: 500 })
      }
    }

    return NextResponse.json({ message: '更新しました' }, { status: 200 })
  } catch (error) {
    console.error('admin users PUT API: サーバーエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ctx = await assertAdminAndGetOperatorOrgId(request)
    if ('error' in ctx) return ctx.error
    const { supabaseAdmin, operatorOrgId } = ctx

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    if (!userId) {
      return NextResponse.json({ message: 'userId が必要です' }, { status: 400 })
    }

    // 対象プロファイルと authUser を取得
    const { data: userProfile, error: upErr } = await supabaseAdmin
      .from('users')
      .select('id, auth_user_id')
      .eq('id', userId)
      .single()
    if (upErr || !userProfile) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 運営組織所属かチェック
    const { data: membership } = await supabaseAdmin
      .from('memberships')
      .select('id, org_id, role')
      .eq('user_id', userId)
      .maybeSingle()
    if (!membership || (operatorOrgId && membership.org_id !== operatorOrgId)) {
      return NextResponse.json({ message: '運営ユーザーではありません' }, { status: 403 })
    }

    // 他のmembershipを持っていないことを確認（混同防止）
    const { data: others } = await supabaseAdmin
      .from('memberships')
      .select('id')
      .eq('user_id', userId)
    if ((others || []).length > 1) {
      return NextResponse.json({ message: '他のロールに所属しているため削除できません' }, { status: 400 })
    }

    await supabaseAdmin.from('memberships').delete().eq('id', membership.id)
    await supabaseAdmin.from('users').delete().eq('id', userId)
    if (userProfile.auth_user_id) {
      await supabaseAdmin.auth.admin.deleteUser(userProfile.auth_user_id)
    }

    return NextResponse.json({ message: '削除しました' }, { status: 200 })
  } catch (error) {
    console.error('admin users DELETE API: サーバーエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

