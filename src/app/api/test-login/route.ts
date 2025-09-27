import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const supabase = createSupabaseAdmin()

    // Check if user exists in auth
    const { data: usersList } = await supabase.auth.admin.listUsers()
    const authUser = usersList.users.find(u =>
      (u.email || '').toLowerCase() === email.toLowerCase()
    )

    if (!authUser) {
      return NextResponse.json({
        error: 'User not found in authentication system',
        solution: 'Please sign up first or check your email address'
      }, { status: 404 })
    }

    if (!authUser.email_confirmed_at) {
      return NextResponse.json({
        error: 'Email not confirmed',
        solution: 'Please check your email and click the verification link',
        authUser: {
          id: authUser.id,
          email: authUser.email,
          confirmed: false
        }
      }, { status: 400 })
    }

    // Check user profile
    const { data: userProfile } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', authUser.id)
      .maybeSingle()

    // Check memberships
    const { data: memberships } = await supabase
      .from('memberships')
      .select('role, org_id, organizations!inner(name, active, approval_status)')
      .eq('user_id', userProfile?.id || authUser.id)

    return NextResponse.json({
      status: 'User details',
      authUser: {
        id: authUser.id,
        email: authUser.email,
        confirmed: !!authUser.email_confirmed_at
      },
      userProfile: userProfile || null,
      memberships: memberships || [],
      canLogin: !!(authUser.email_confirmed_at && (userProfile || (memberships && memberships.length > 0)))
    })

  } catch (error) {
    console.error('Test login error:', error)
    return NextResponse.json({
      error: 'Server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}