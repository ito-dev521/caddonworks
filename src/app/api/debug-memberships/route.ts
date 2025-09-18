import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
    // リクエストヘッダーから認証トークンを取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '認証トークンが見つかりません' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    console.log('デバッグ: 認証ユーザーID:', user.id)

    // 全メンバーシップを取得
    const { data: allMemberships, error: allMembershipsError } = await supabaseAdmin
      .from('memberships')
      .select('*')

    console.log('デバッグ: 全メンバーシップ:', allMemberships)

    // 特定ユーザーのメンバーシップを取得
    const { data: userMemberships, error: userMembershipsError } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .eq('user_id', user.id)

    console.log('デバッグ: ユーザーメンバーシップ:', userMemberships)

    // 認証ユーザー一覧を取得
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const currentAuthUser = authUsers?.users?.find(u => u.id === user.id)

    return NextResponse.json({
      debug: {
        authUserId: user.id,
        authUserEmail: user.email,
        currentAuthUser: currentAuthUser ? {
          id: currentAuthUser.id,
          email: currentAuthUser.email,
          created_at: currentAuthUser.created_at
        } : null,
        allMemberships: allMemberships,
        userMemberships: userMemberships,
        allMembershipsError: allMembershipsError,
        userMembershipsError: userMembershipsError
      }
    }, { status: 200 })

  } catch (error) {
    console.error('デバッグAPIエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
