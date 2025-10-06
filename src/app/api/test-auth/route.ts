export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({
        error: 'Email and password are required',
        debug: {
          email: !!email,
          password: !!password
        }
      }, { status: 400 })
    }

    // Create a supabase client for auth testing
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

    console.log('🔐 Testing authentication for email:', email)

    // Try to sign in with the provided credentials
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    console.log('🔐 Auth result:', {
      success: !error,
      user: data?.user?.email,
      error: error?.message
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.status,
        debug: {
          supabaseUrl: supabaseUrl ? 'configured' : 'missing',
          serviceKey: supabaseServiceRoleKey ? 'configured' : 'missing'
        }
      }, { status: 401 })
    }

    // Check if user exists in our users table
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('auth_user_id', data.user.id)
      .single()

    console.log('👤 User profile check:', {
      profileExists: !profileError,
      profileError: profileError?.message,
      userProfile: userProfile ? {
        id: userProfile.id,
        display_name: userProfile.display_name,
        email: userProfile.email
      } : null
    })

    return NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        email_confirmed: data.user.email_confirmed_at
      },
      userProfile: userProfile ? {
        id: userProfile.id,
        display_name: userProfile.display_name,
        email: userProfile.email
      } : null,
      profileError: profileError?.message
    })

  } catch (error: any) {
    console.error('❌ Auth test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 })
  }

  finally {
    // Sign out to clean up
    // Note: We don't sign out here as it might affect other sessions
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Auth test endpoint. Use POST with email and password.',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'configured' : 'missing',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing'
  })
}