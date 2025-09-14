import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    // Service Role Keyを使用してSupabaseクライアントを作成
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

    const demoAccounts = [
      {
        email: 'admin@demo.com',
        password: 'demo123',
        displayName: '管理者デモ',
        role: 'OrgAdmin' as const,
        organizationName: 'デモ建設株式会社'
      },
      {
        email: 'contractor@demo.com',
        password: 'demo123',
        displayName: '受注者デモ',
        role: 'Contractor' as const,
        specialties: ['道路設計', '橋梁設計'],
        qualifications: ['技術士（建設部門）', '一級建築士']
      },
      {
        email: 'reviewer@demo.com',
        password: 'demo123',
        displayName: '監督員デモ',
        role: 'Reviewer' as const,
        organizationName: 'デモ建設株式会社'
      }
    ]

    const results = []

    for (const account of demoAccounts) {
      try {
        // 既存のユーザーをチェック
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('email', account.email)
          .single()

        if (existingUser) {
          results.push({
            email: account.email,
            status: 'already_exists',
            message: '既に存在します'
          })
          continue
        }

        // Service Role Keyを使用してユーザーを作成（メール確認をスキップ）
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: account.email,
          password: account.password,
          email_confirm: true, // メール確認を有効にする
          user_metadata: {
            display_name: account.displayName,
            role: account.role
          }
        })

        if (authError) {
          results.push({
            email: account.email,
            status: 'auth_error',
            message: authError.message
          })
          continue
        }

        if (!authData.user) {
          results.push({
            email: account.email,
            status: 'auth_error',
            message: 'ユーザー作成に失敗しました'
          })
          continue
        }

        // 2. usersテーブルにプロファイルを作成
        const { data: userData, error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            auth_user_id: authData.user.id,
            email: account.email,
            display_name: account.displayName,
            specialties: account.specialties || [],
            qualifications: account.qualifications || []
          })
          .select()
          .single()

        if (userError) {
          results.push({
            email: account.email,
            status: 'user_error',
            message: userError.message
          })
          continue
        }

        // 3. 組織を作成または取得
        let orgId = null
        if (account.organizationName) {
          const { data: orgData, error: orgError } = await supabaseAdmin
            .from('organizations')
            .insert({
              name: account.organizationName,
              description: `${account.organizationName}のデモ組織`,
              billing_email: account.email,
              system_fee: 0,
              active: true
            })
            .select()
            .single()

          if (orgError) {
            // 既存の組織を取得
            const { data: existingOrg } = await supabaseAdmin
              .from('organizations')
              .select('id')
              .eq('name', account.organizationName)
              .single()

            if (existingOrg) {
              orgId = existingOrg.id
            }
          } else {
            orgId = orgData.id
          }
        }

        // 4. メンバーシップを作成
        const membershipData: any = {
          user_id: userData.id,
          role: account.role
        }
        
        if (orgId) {
          membershipData.org_id = orgId
        }
        
        const { error: membershipError } = await supabaseAdmin
          .from('memberships')
          .insert(membershipData)

        if (membershipError) {
          results.push({
            email: account.email,
            status: 'membership_error',
            message: membershipError.message
          })
        } else {
          results.push({
            email: account.email,
            status: 'success',
            message: 'デモアカウントを作成しました'
          })
        }

      } catch (error: any) {
        results.push({
          email: account.email,
          status: 'error',
          message: error.message
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのセットアップが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Create demo users admin error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
