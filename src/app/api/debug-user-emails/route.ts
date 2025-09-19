import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function GET(request: NextRequest) {
  try {
    // 認証ヘッダーからユーザー情報を取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ message: '認証が必要です' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // デモ建設関連のユーザーを検索
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .or('email.ilike.%demo-construction%,display_name.ilike.%デモ建設%')

    if (usersError) {
      return NextResponse.json({ message: 'ユーザー検索に失敗しました' }, { status: 500 })
    }

    // 認証ユーザー情報も取得
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    
    // メンバーシップ情報も取得
    const userIds = users?.map(u => u.id) || []
    const { data: memberships } = await supabaseAdmin
      .from('memberships')
      .select('*')
      .in('user_id', userIds)

    // 結果を整形
    const result = users?.map(user => {
      const authUser = authUsers?.users?.find(au => au.id === user.auth_user_id)
      const membership = memberships?.find(m => m.user_id === user.id)
      
      return {
        user_id: user.id,
        auth_user_id: user.auth_user_id,
        email: user.email,
        display_name: user.display_name,
        formal_name: user.formal_name,
        auth_email: authUser?.email,
        membership_role: membership?.role,
        membership_org_id: membership?.org_id,
        created_at: user.created_at
      }
    }) || []

    return NextResponse.json({ 
      message: 'デモ建設関連ユーザーの調査結果',
      users: result,
      total_count: result.length
    }, { status: 200 })

  } catch (error) {
    console.error('デバッグAPIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
