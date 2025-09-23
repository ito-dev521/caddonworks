import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function POST(request: NextRequest) {
  try {

    // orgadmin@demo.comユーザーを取得
    const { data: orgAdminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'orgadmin@demo.com')
      .single()

    if (userError || !orgAdminUser) {
      console.error('orgadmin@demo.comユーザーが見つかりません:', userError)
      return NextResponse.json(
        { message: 'orgadmin@demo.comユーザーが見つかりません' },
        { status: 404 }
      )
    }


    // ユーザーの表示名を「管理者デモ」に更新
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        display_name: '管理者デモ',
        updated_at: new Date().toISOString()
      })
      .eq('id', orgAdminUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('ユーザー更新エラー:', updateError)
      return NextResponse.json(
        { message: 'ユーザーの更新に失敗しました' },
        { status: 500 }
      )
    }


    return NextResponse.json({
      message: 'orgadmin@demo.comの表示名を「管理者デモ」に変更しました',
      user: updatedUser
    }, { status: 200 })

  } catch (error) {
    console.error('fix-orgadmin-display API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}

















