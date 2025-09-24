export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 Testing Box permissions system...')

    // Check if Box permissions tables exist
    const { data: permissionsCheck, error: permissionsError } = await supabaseAdmin
      .from('box_permissions')
      .select('count')
      .limit(1)

    console.log('📦 box_permissions table check:', {
      exists: !permissionsError,
      error: permissionsError?.message
    })

    // Check if users table exists and get its structure
    const { data: usersCheck, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(3)

    console.log('👥 users table check:', {
      exists: !usersError,
      userCount: usersCheck?.length || 0,
      error: usersError?.message,
      sampleUser: usersCheck?.[0] ? Object.keys(usersCheck[0]) : null
    })

    // Test admin email configuration
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',') || []
    console.log('🔧 Admin emails:', adminEmails)

    return NextResponse.json({
      success: true,
      checks: {
        box_permissions_table: !permissionsError,
        users_table: !usersError,
        admin_emails_configured: adminEmails.length > 0,
        user_count: usersCheck?.length || 0
      },
      errors: {
        box_permissions: permissionsError?.message,
        users: usersError?.message
      },
      admin_emails: adminEmails
    })

  } catch (error: any) {
    console.error('❌ Test error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}