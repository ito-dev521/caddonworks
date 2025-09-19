import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generatePassword } from '@/lib/password-generator'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ message: 'ユーザーIDが必要です' }, { status: 400 })
    }

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

    // 対象ユーザーの情報を取得
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !targetUser) {
      return NextResponse.json({ message: '対象ユーザーが見つかりません' }, { status: 404 })
    }

    // 既に認証ユーザーが存在する場合はエラー
    if (targetUser.auth_user_id) {
      return NextResponse.json({ message: 'このユーザーは既に認証ユーザーが設定されています' }, { status: 400 })
    }

    // パスワードを生成
    const password = generatePassword()

    // 認証ユーザーを作成
    const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email: targetUser.email,
      password,
      email_confirm: true
    })

    if (authCreateError || !authUser.user) {
      console.error('認証ユーザー作成エラー:', authCreateError)
      return NextResponse.json({ message: '認証ユーザーの作成に失敗しました' }, { status: 500 })
    }

    // ユーザープロフィールのauth_user_idを更新
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ auth_user_id: authUser.user.id })
      .eq('id', userId)

    if (updateError) {
      console.error('ユーザープロフィール更新エラー:', updateError)
      // 作成した認証ユーザーを削除（ロールバック）
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ message: 'ユーザープロフィールの更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: '認証ユーザーが正常に作成されました',
      password: password,
      authUserId: authUser.user.id
    }, { status: 200 })

  } catch (error) {
    console.error('認証ユーザー修正APIエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました', error: error instanceof Error ? error.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
