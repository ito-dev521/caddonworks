export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    console.log('👥 Listing all users...')

    // List users from Supabase auth
    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()

    console.log('🔐 Auth users:', {
      count: authUsers?.users?.length || 0,
      error: authError?.message
    })

    // List users from our users table
    const { data: dbUsers, error: dbError } = await supabaseAdmin
      .from('users')
      .select('*')

    console.log('💾 Database users:', {
      count: dbUsers?.length || 0,
      error: dbError?.message
    })

    return NextResponse.json({
      success: true,
      authUsers: authUsers?.users?.map(user => ({
        id: user.id,
        email: user.email,
        email_confirmed: user.email_confirmed_at,
        created_at: user.created_at,
        last_sign_in: user.last_sign_in_at
      })) || [],
      dbUsers: dbUsers?.map(user => ({
        id: user.id,
        auth_user_id: user.auth_user_id,
        display_name: user.display_name,
        email: user.email,
        organization: user.organization
      })) || [],
      authUsersCount: authUsers?.users?.length || 0,
      dbUsersCount: dbUsers?.length || 0
    })

  } catch (error: any) {
    console.error('❌ List users error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}