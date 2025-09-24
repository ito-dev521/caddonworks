export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function POST(request: NextRequest) {
  try {
    const adminEmail = 'ito.dev@ii-stylelab.com'
    const adminAuthId = '15f84d6d-35d1-4ea4-8f2c-407919f59985'

    console.log('👤 Creating admin profile for:', adminEmail)

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('auth_user_id', adminAuthId)
      .single()

    if (existingProfile) {
      return NextResponse.json({
        success: true,
        message: 'Admin profile already exists',
        profile: existingProfile
      })
    }

    // Create admin profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .insert({
        auth_user_id: adminAuthId,
        email: adminEmail,
        display_name: '伊藤 管理者',
        formal_name: '伊藤 管理者',
        organization: '管理者',
        specialties: ['システム管理'],
        qualifications: ['管理者権限'],
        experience_years: 10
      })
      .select()
      .single()

    if (profileError) {
      console.error('Profile creation error:', profileError)
      return NextResponse.json({
        success: false,
        error: 'プロフィール作成に失敗しました',
        details: profileError.message
      }, { status: 500 })
    }

    console.log('✅ Admin profile created:', newProfile)

    return NextResponse.json({
      success: true,
      message: 'Admin profile created successfully',
      profile: newProfile
    })

  } catch (error: any) {
    console.error('❌ Create admin profile error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to create admin profile for ito.dev@ii-stylelab.com'
  })
}