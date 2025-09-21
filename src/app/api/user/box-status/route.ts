export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
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

    // Get user profile with BOX information
    const { data: userProfile, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, box_email, box_user_id, box_account_type, box_oauth_expires_at, updated_at')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !userProfile) {
      return NextResponse.json(
        { message: 'ユーザープロフィールが見つかりません' },
        { status: 404 }
      )
    }

    // Determine if BOX account is linked
    const isLinked = !!(userProfile.box_email && userProfile.box_user_id)

    return NextResponse.json({
      isLinked,
      boxEmail: userProfile.box_email,
      boxUserId: userProfile.box_user_id,
      accountType: userProfile.box_account_type,
      lastUpdated: userProfile.updated_at
    }, { status: 200 })

  } catch (error: any) {
    console.error('BOX status API error:', error)
    return NextResponse.json(
      { message: 'BOXステータス取得に失敗しました', error: error.message },
      { status: 500 }
    )
  }
}