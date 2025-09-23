export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBoxAuthUrl } from '@/lib/box-oauth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { message: '認証が必要です' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { message: '認証に失敗しました' },
        { status: 401 }
      )
    }

    // Get user profile
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

    const { accountType } = await request.json()

    if (!accountType || !['new', 'existing'].includes(accountType)) {
      return NextResponse.json(
        { message: '無効なアカウントタイプです' },
        { status: 400 }
      )
    }

    // Generate state parameter with user ID and account type
    const state = `${userProfile.id}|${accountType}`

    // Generate BOX OAuth URL
    const authUrl = getBoxAuthUrl(state)

    return NextResponse.json({
      authUrl,
      message: 'BOX認証URLを生成しました'
    }, { status: 200 })

  } catch (error: any) {
    console.error('BOX OAuth authorize error:', error)
    return NextResponse.json(
      { message: 'BOX認証URL生成に失敗しました', error: error.message },
      { status: 500 }
    )
  }
}