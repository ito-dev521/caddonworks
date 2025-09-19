import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export async function POST(request: NextRequest) {
  try {
    
    // リクエストヘッダーから認証トークンを取得
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: '認証トークンが見つかりません' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')

    // トークンからユーザー情報を取得
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)


    if (authError || !user) {
      return NextResponse.json({ message: '認証に失敗しました' }, { status: 401 })
    }

    // 既存のプロフィールをチェック
    const { data: existingProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()


    if (existingProfile) {
      return NextResponse.json({ message: 'プロフィールは既に存在します' }, { status: 200 })
    }

    // メンバーシップをチェック
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from('memberships')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()


    if (membershipError || !membership) {
      
      // メンバーシップが存在しない場合は作成を試行
      // まず組織を取得または作成
      const { data: organizations, error: orgError } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .limit(1)

      let orgId: string
      if (organizations && organizations.length > 0) {
        orgId = organizations[0].id
      } else {
        // 組織が存在しない場合は作成
        const { data: newOrg, error: createOrgError } = await supabaseAdmin
          .from('organizations')
          .insert({
            name: user.email?.split('@')[1] || 'Default Organization',
            domain: user.email?.split('@')[1] || 'example.com'
          })
          .select()
          .single()

        if (createOrgError || !newOrg) {
          return NextResponse.json({ message: '組織の作成に失敗しました' }, { status: 500 })
        }
        orgId = newOrg.id
      }

      // メンバーシップを作成
      const { data: newMembership, error: createMembershipError } = await supabaseAdmin
        .from('memberships')
        .insert({
          user_id: user.id,
          org_id: orgId,
          role: 'OrgAdmin'
        })
        .select()
        .single()

      if (createMembershipError || !newMembership) {
        return NextResponse.json({ message: 'メンバーシップの作成に失敗しました' }, { status: 500 })
      }
    }

    // プロフィールを作成
    const { data: newProfile, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: user.id,
        email: user.email || '',
        display_name: user.email?.split('@')[0] || '管理者',
        formal_name: null
      })
      .select()
      .single()


    if (createError) {
      console.error('プロフィール作成エラー:', createError)
      return NextResponse.json({ message: 'プロフィールの作成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'プロフィールが正常に作成されました',
      profile: newProfile
    }, { status: 200 })

  } catch (error) {
    console.error('プロフィールセットアップAPIエラー:', error)
    return NextResponse.json({ message: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
