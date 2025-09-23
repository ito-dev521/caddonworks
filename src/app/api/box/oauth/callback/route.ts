export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  exchangeCodeForTokens,
  getBoxUserInfo,
  saveUserBoxTokens
} from '@/lib/box-oauth'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state') // This should contain user ID
    const error = searchParams.get('error')

    if (error) {
      console.error('BOX OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?box_error=${encodeURIComponent(error)}`
      )
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/settings?box_error=missing_parameters`
      )
    }

    
    // Exchange authorization code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Get BOX user information
    const boxUserInfo = await getBoxUserInfo(tokens.access_token)

    
    // Parse state to get user ID and account type
    const [userId, accountType] = state.split('|')

    if (!userId || !['new', 'existing'].includes(accountType)) {
      throw new Error('Invalid state parameter')
    }

    // Save tokens to user profile
    await saveUserBoxTokens(
      userId,
      tokens,
      boxUserInfo,
      accountType as 'new' | 'existing'
    )

    
    // Redirect back to settings with success message
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?box_success=true`
    )

  } catch (error: any) {
    console.error('BOX OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/settings?box_error=${encodeURIComponent(error.message || 'Unknown error')}`
    )
  }
}