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
    console.log('fix-admin-membership-only API: 開始')

    // 1. イースタイルラボ株式会社の組織を作成または取得
    let organization
    const { data: existingOrg, error: orgCheckError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', 'イースタイルラボ株式会社')
      .single()

    if (orgCheckError && orgCheckError.code !== 'PGRST116') {
      console.error('組織確認エラー:', orgCheckError)
      return NextResponse.json(
        { message: '組織の確認に失敗しました' },
        { status: 500 }
      )
    }

    if (existingOrg) {
      console.log('イースタイルラボ株式会社は既に存在します:', existingOrg)
      organization = existingOrg
    } else {
      // 組織を作成
      const { data: newOrg, error: orgCreateError } = await supabaseAdmin
        .from('organizations')
        .insert({
          name: 'イースタイルラボ株式会社',
          description: 'システム運営会社'
        })
        .select()
        .single()

      if (orgCreateError) {
        console.error('組織作成エラー:', orgCreateError)
        return NextResponse.json(
          { message: '組織の作成に失敗しました' },
          { status: 500 }
        )
      }

      console.log('イースタイルラボ株式会社を作成しました:', newOrg)
      organization = newOrg
    }

    // 2. admin@demo.comユーザーを取得
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single()

    if (userError || !adminUser) {
      console.error('admin@demo.comユーザーが見つかりません:', userError)
      return NextResponse.json(
        { message: 'admin@demo.comユーザーが見つかりません' },
        { status: 404 }
      )
    }

    console.log('admin@demo.comユーザーを発見:', adminUser)

    // 3. ユーザーの表示名を更新（roleカラムは使わない）
    const { data: updatedUser, error: updateError } = await supabaseAdmin
      .from('users')
      .update({ 
        display_name: '運営者デモ',
        updated_at: new Date().toISOString()
      })
      .eq('id', adminUser.id)
      .select()
      .single()

    if (updateError) {
      console.error('ユーザー更新エラー:', updateError)
      return NextResponse.json(
        { message: 'ユーザーの更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log('ユーザー更新成功:', updatedUser)

    // 4. 既存のmembershipを削除
    const { error: deleteMembershipError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', adminUser.id)

    if (deleteMembershipError) {
      console.error('membership削除エラー:', deleteMembershipError)
      return NextResponse.json(
        { message: 'membershipの削除に失敗しました' },
        { status: 500 }
      )
    }

    console.log('membership削除成功')

    // 5. 新しいmembershipを作成（Adminとして）
    const { data: newMembership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: adminUser.id,
        org_id: organization.id,
        role: 'Admin'
      })
      .select()
      .single()

    if (membershipError) {
      console.error('membership作成エラー:', membershipError)
      return NextResponse.json(
        { message: 'membershipの作成に失敗しました' },
        { status: 500 }
      )
    }

    console.log('membership作成成功:', newMembership)

    return NextResponse.json({
      message: 'admin@demo.comをイースタイルラボ株式会社の運営者（Admin）に設定しました',
      user: updatedUser,
      organization: organization,
      membership: newMembership
    }, { status: 200 })

  } catch (error) {
    console.error('fix-admin-membership-only API: サーバーエラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}



