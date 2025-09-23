import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

/**
 * APIエンドポイントで組織の稼働状態をチェックするミドルウェア
 */
export async function checkOrganizationActive(
  request: NextRequest,
  userId: string
): Promise<{ allowed: boolean; response?: NextResponse }> {
  try {
    const supabase = createSupabaseAdmin()

    // ユーザーのメンバーシップと組織情報を取得
    const { data: memberships, error } = await supabase
      .from('memberships')
      .select(`
        org_id,
        organizations!inner(id, name, active, approval_status)
      `)
      .eq('user_id', userId)

    if (error || !memberships || memberships.length === 0) {
      // メンバーシップがない場合は許可（管理者など）
      return { allowed: true }
    }

    // いずれかの組織が稼働中かつ承認済みの場合は許可
    const hasActiveOrganization = memberships.some((membership: any) => {
      const org = membership.organizations
      return org.active && org.approval_status === 'approved'
    })

    if (!hasActiveOrganization) {
      return {
        allowed: false,
        response: NextResponse.json(
          {
            message: 'ご利用の組織は現在停止中または承認待ちです。詳細については管理者にお問い合わせください。',
            code: 'ORGANIZATION_SUSPENDED'
          },
          { status: 403 }
        )
      }
    }

    return { allowed: true }
  } catch (error) {
    console.error('Error checking organization status:', error)
    // エラー時は許可（システムの安定性を優先）
    return { allowed: true }
  }
}

/**
 * API関数で組織チェックを実行するヘルパー
 */
export async function withOrganizationCheck(
  request: NextRequest,
  handler: (request: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const supabase = createSupabaseAdmin()

    // Authorization ヘッダーからユーザーを取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // ユーザー情報を取得
    const { data: userProfile } = await supabase
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ message: 'ユーザーが見つかりません' }, { status: 403 })
    }

    // 管理者メールの場合は組織チェックをスキップ
    const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
      .split(',')
      .map(e => e.trim().toLowerCase())

    if (adminEmails.includes(user.email?.toLowerCase() || '')) {
      return await handler(request)
    }

    // 組織状態チェック
    const { allowed, response } = await checkOrganizationActive(request, userProfile.id)

    if (!allowed && response) {
      return response
    }

    return await handler(request)
  } catch (error) {
    console.error('Error in organization check middleware:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}