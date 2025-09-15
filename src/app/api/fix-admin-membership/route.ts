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
    console.log('fix-admin-membership API: 開始')

    // 1. 発注者ユーザーを取得
    const { data: adminUser, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', 'admin@demo.com')
      .single()

    if (userError || !adminUser) {
      return NextResponse.json({
        message: '発注者ユーザーが見つかりません',
        error: userError?.message
      }, { status: 404 })
    }

    console.log('fix-admin-membership API: 発注者ユーザー取得完了', adminUser.id)

    // 2. デモ建設株式会社を取得
    const { data: demoOrg, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', 'デモ建設株式会社')
      .single()

    if (orgError || !demoOrg) {
      return NextResponse.json({
        message: 'デモ建設株式会社が見つかりません',
        error: orgError?.message
      }, { status: 404 })
    }

    console.log('fix-admin-membership API: デモ建設株式会社取得完了', demoOrg.id)

    // 3. 既存のメンバーシップを削除
    const { error: deleteError } = await supabaseAdmin
      .from('memberships')
      .delete()
      .eq('user_id', adminUser.id)

    if (deleteError) {
      console.log('fix-admin-membership API: 既存メンバーシップ削除エラー（無視）', deleteError.message)
    } else {
      console.log('fix-admin-membership API: 既存メンバーシップ削除完了')
    }

    // 4. 新しいメンバーシップを作成
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .insert({
        user_id: adminUser.id,
        org_id: demoOrg.id,
        role: 'OrgAdmin'
      })
      .select()
      .single()

    if (membershipError) {
      console.error('fix-admin-membership API: メンバーシップ作成エラー', membershipError)
      return NextResponse.json({
        message: 'メンバーシップの作成に失敗しました',
        error: membershipError.message
      }, { status: 500 })
    }

    console.log('fix-admin-membership API: メンバーシップ作成完了', membership)

    // 5. 確認：発注者の案件を取得
    const { data: projects, error: projectsError } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('org_id', demoOrg.id)

    console.log('fix-admin-membership API: 発注者の案件確認', { 
      count: projects?.length || 0, 
      error: projectsError?.message 
    })

    return NextResponse.json({
      message: '発注者の組織所属を修正しました',
      data: {
        adminUser: {
          id: adminUser.id,
          email: adminUser.email,
          display_name: adminUser.display_name
        },
        organization: {
          id: demoOrg.id,
          name: demoOrg.name
        },
        membership: {
          id: membership.id,
          role: membership.role
        },
        projects: projects || []
      }
    })

  } catch (error) {
    console.error('fix-admin-membership API: エラー', error)
    return NextResponse.json(
      { message: '発注者組織所属修正エラー', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
