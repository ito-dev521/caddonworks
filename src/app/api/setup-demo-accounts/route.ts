import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const demoAccounts = [
      {
        email: 'admin@demo.com',
        password: 'demo123',
        displayName: '運営者デモ',
        role: 'Admin' as const,
        organizationName: 'システム運営'
      },
      {
        email: 'orgadmin@demo.com',
        password: 'demo123',
        displayName: '発注者デモ',
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
        const { data: existingUser } = await supabase
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

        // 1. Supabase Authでユーザーを作成（メール確認を無効にする）
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: account.email,
          password: account.password,
          options: {
            data: {
              display_name: account.displayName,
              role: account.role
            }
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

        // 2. ユーザープロフィールを作成
        const { data: userData, error: userError } = await supabase
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
            status: 'profile_error',
            message: userError.message
          })
          continue
        }

        // 3. 組織が必要な場合（OrgAdmin, Reviewer）
        let orgId = null
        if (account.organizationName) {
          // 既存の組織をチェック
          const { data: existingOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', account.organizationName)
            .single()

          if (existingOrg) {
            orgId = existingOrg.id
          } else {
            // 新しい組織を作成
            const { data: orgData, error: orgError } = await supabase
              .from('organizations')
              .insert({
                name: account.organizationName,
                description: 'デモ用の組織です',
                billing_email: account.email,
                system_fee: 50000,
                active: true
              })
              .select()
              .single()

            if (orgError) {
              results.push({
                email: account.email,
                status: 'org_error',
                message: orgError.message
              })
              continue
            }

            orgId = orgData.id
          }
        }

        // 4. メンバーシップを作成
        const membershipData: any = {
          user_id: userData.id,
          role: account.role
        }
        
        // org_idは組織が必要な場合のみ設定
        if (orgId) {
          membershipData.org_id = orgId
        } else if (account.role === 'Contractor') {
          // 受注者の場合は、デフォルト組織を作成または取得
          const { data: defaultOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('name', 'デフォルト組織')
            .single()

          if (defaultOrg) {
            membershipData.org_id = defaultOrg.id
          } else {
            const { data: newDefaultOrg, error: defaultOrgError } = await supabase
              .from('organizations')
              .insert({
                name: 'デフォルト組織',
                description: '受注者用のデフォルト組織',
                billing_email: 'default@example.com',
                system_fee: 0,
                active: true
              })
              .select()
              .single()

            if (defaultOrgError) {
              results.push({
                email: account.email,
                status: 'org_error',
                message: defaultOrgError.message
              })
              continue
            }

            membershipData.org_id = newDefaultOrg.id
          }
        }
        
        const { error: membershipError } = await supabase
          .from('memberships')
          .insert(membershipData)

        if (membershipError) {
          results.push({
            email: account.email,
            status: 'membership_error',
            message: membershipError.message
          })
          continue
        }

        results.push({
          email: account.email,
          status: 'success',
          message: 'デモアカウントを作成しました'
        })

      } catch (error) {
        results.push({
          email: account.email,
          status: 'error',
          message: '予期しないエラーが発生しました'
        })
      }
    }

    return NextResponse.json({
      message: 'デモアカウントのセットアップが完了しました',
      results
    }, { status: 200 })

  } catch (error) {
    console.error('Demo accounts setup error:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
