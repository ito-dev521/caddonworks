export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { cache } from '@/lib/cache'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/**
 * キャッシュクリアAPI
 * 管理者権限（OrgAdmin）のユーザーのみが実行可能
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // 組織の管理者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships) {
      return NextResponse.json(
        { message: 'メンバーシップ情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    const isAdmin = memberships.some(m => m.role === 'OrgAdmin')
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'この操作には管理者権限が必要です' },
        { status: 403 }
      )
    }

    // リクエストボディから操作タイプを取得
    const body = await request.json().catch(() => ({}))
    const { pattern, clearAll } = body

    if (clearAll) {
      // すべてのキャッシュをクリア
      cache.clear()
      return NextResponse.json({
        message: 'すべてのキャッシュをクリアしました',
        cleared: 'all'
      })
    } else if (pattern) {
      // パターンに一致するキャッシュをクリア
      cache.deletePattern(pattern)
      return NextResponse.json({
        message: `パターン "${pattern}" に一致するキャッシュをクリアしました`,
        pattern
      })
    } else {
      // BOX関連のキャッシュのみクリア（デフォルト）
      cache.deletePattern('box_')
      return NextResponse.json({
        message: 'BOX関連のキャッシュをクリアしました',
        pattern: 'box_'
      })
    }

  } catch (error: any) {
    console.error('Cache clear error:', error)
    return NextResponse.json(
      { message: 'キャッシュクリアエラー', error: error.message },
      { status: 500 }
    )
  }
}

/**
 * キャッシュ統計情報取得API
 * 管理者権限（OrgAdmin）のユーザーのみが実行可能
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    // ユーザープロフィールを取得
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // 組織の管理者権限をチェック
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('user_id', userProfile.id)

    if (membershipError || !memberships) {
      return NextResponse.json(
        { message: 'メンバーシップ情報の取得に失敗しました' },
        { status: 500 }
      )
    }

    const isAdmin = memberships.some(m => m.role === 'OrgAdmin')
    if (!isAdmin) {
      return NextResponse.json(
        { message: 'この操作には管理者権限が必要です' },
        { status: 403 }
      )
    }

    // キャッシュ統計情報を取得
    const stats = cache.getStats()

    return NextResponse.json({
      ...stats,
      message: 'キャッシュ統計情報を取得しました'
    })

  } catch (error: any) {
    console.error('Cache stats error:', error)
    return NextResponse.json(
      { message: 'キャッシュ統計情報の取得エラー', error: error.message },
      { status: 500 }
    )
  }
}
