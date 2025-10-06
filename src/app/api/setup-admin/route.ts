import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // Try to create the user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Skip email verification for admin setup
    })

    if (authError && !authError.message.includes('already been registered')) {
      throw authError
    }

    const userId = authData?.user?.id ||
      (await supabase.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id

    if (!userId) {
      throw new Error('Could not create or find user')
    }

    // Create user profile
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .upsert({
        auth_user_id: userId,
        email,
        display_name: 'Administrator',
        formal_name: 'System Administrator',
        specialties: [],
        qualifications: []
      })
      .select()
      .single()

    if (profileError) {
      console.warn('Profile creation warning:', profileError)
    }

    // Create admin organization if not exists
    const { data: adminOrg, error: orgError } = await supabase
      .from('organizations')
      .upsert({
        name: 'システム管理者',
        description: '管理者用組織',
        system_fee: 0,
        active: true,
        approval_status: 'approved'
      })
      .select()
      .single()

    if (orgError) {
      console.warn('Organization creation warning:', orgError)
    }

    // Create membership
    if (profileData && adminOrg) {
      const { error: membershipError } = await supabase
        .from('memberships')
        .upsert({
          user_id: profileData.id,
          org_id: adminOrg.id,
          role: 'Admin'
        })

      if (membershipError) {
        console.warn('Membership creation warning:', membershipError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Admin user setup completed',
      userId,
      canLogin: true
    })

  } catch (error) {
    console.error('Admin setup error:', error)
    return NextResponse.json({
      error: 'Failed to setup admin user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}