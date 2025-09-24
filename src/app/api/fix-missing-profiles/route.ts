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
    const results = []

    // contractor@demo.com のプロフィールとメンバーシップを作成
    const contractorEmail = 'contractor@demo.com'
    
    // 認証ユーザーを取得
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const contractorAuthUser = authUsers.users.find(u => u.email === contractorEmail)
    
    if (!contractorAuthUser) {
      return NextResponse.json({ message: 'contractor@demo.com の認証ユーザーが見つかりません' }, { status: 404 })
    }

    // プロフィールが既に存在するかチェック
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('auth_user_id', contractorAuthUser.id)
      .maybeSingle()

    if (existingProfile) {
      results.push({ email: contractorEmail, status: 'profile_exists', profile_id: existingProfile.id })
    } else {
      // プロフィールを作成
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('users')
        .insert({
          auth_user_id: contractorAuthUser.id,
          email: contractorEmail,
          display_name: 'デモ受注者',
          specialties: ['土木設計', '構造設計'],
          qualifications: ['技術士', '一級建築士'],
          experience_years: 5,
          member_level: 'intermediate'
        })
        .select('id')
        .single()

      if (profileError) {
        console.error('プロフィール作成エラー:', profileError)
        results.push({ email: contractorEmail, status: 'profile_error', error: profileError.message })
      } else {
        results.push({ email: contractorEmail, status: 'profile_created', profile_id: profile.id })
        
        // メンバーシップを作成（個人事業主として）
        const { error: membershipError } = await supabaseAdmin
          .from('memberships')
          .insert({
            user_id: profile.id,
            org_id: null, // 個人事業主なのでnull
            role: 'Contractor'
          })

        if (membershipError) {
          console.error('メンバーシップ作成エラー:', membershipError)
          results.push({ email: contractorEmail, status: 'membership_error', error: membershipError.message })
        } else {
          results.push({ email: contractorEmail, status: 'membership_created' })
        }
      }
    }

    return NextResponse.json({
      message: '欠損プロフィールの修復が完了しました',
      results
    })

  } catch (error) {
    console.error('fix-missing-profiles API: エラー:', error)
    return NextResponse.json(
      { message: 'サーバーエラーが発生しました: ' + (error instanceof Error ? error.message : '不明なエラー') },
      { status: 500 }
    )
  }
}
