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

    // admin@demo.comのユーザーを取得
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, display_name')
      .eq('email', 'admin@demo.com')
      .single()

    if (userError || !adminUser) {
      console.error('admin@demo.comユーザーが見つかりません:', userError)
      return NextResponse.json(
        { message: 'admin@demo.comユーザーが見つかりません' },
        { status: 404 }
      )
    }


    // ユーザーのロールをAdminに更新
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        role: 'Admin',
        display_name: '運営者デモ',
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('ユーザーロール更新エラー:', updateError)
      return NextResponse.json(
        { message: 'ユーザーロールの更新に失敗しました' },
        { status: 500 }
      )
    }


    // 既存のmembershipを削除（OrgAdminとしての所属を削除）
    const { error: deleteMembershipError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', adminUser.id)

    if (deleteMembershipError) {
      console.error('membership削除エラー:', deleteMembershipError)
      // エラーでも続行
    } else {
    }

    return NextResponse.json({
      message: 'admin@demo.comを運営者（Admin）に変更しました',
      user: updatedUser
    }, { status: 200 })

  } catch (error) {
    console.error('fix-admin-role API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}








