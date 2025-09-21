// BOX OAuth 2.0 integration for user account linking
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export interface BoxOAuthTokens {
  access_token: string
  refresh_token: string
  expires_in: number
}

export interface BoxUserInfo {
  id: string
  name: string
  login: string // email
}

// Generate BOX OAuth authorization URL
export function getBoxAuthUrl(state: string): string {
  const clientId = process.env.BOX_CLIENT_ID!
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/box/oauth/callback`

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'root_readwrite',
    state // Include user ID or session identifier
  })

  return `https://account.box.com/api/oauth2/authorize?${params}`
}

// Exchange authorization code for access token
export async function exchangeCodeForTokens(code: string): Promise<BoxOAuthTokens> {
  const redirectUri = `${process.env.NEXTAUTH_URL}/api/box/oauth/callback`

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: process.env.BOX_CLIENT_ID!,
    client_secret: process.env.BOX_CLIENT_SECRET!,
    redirect_uri: redirectUri
  })

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`BOX OAuth token exchange failed ${res.status}: ${errorText}`)
  }

  return res.json()
}

// Get BOX user information using access token
export async function getBoxUserInfo(accessToken: string): Promise<BoxUserInfo> {
  const res = await fetch('https://api.box.com/2.0/users/me', {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`BOX user info fetch failed ${res.status}: ${errorText}`)
  }

  return res.json()
}

// Refresh BOX access token
export async function refreshBoxToken(refreshToken: string): Promise<BoxOAuthTokens> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.BOX_CLIENT_ID!,
    client_secret: process.env.BOX_CLIENT_SECRET!
  })

  const res = await fetch('https://api.box.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`BOX token refresh failed ${res.status}: ${errorText}`)
  }

  return res.json()
}

// Save BOX OAuth tokens to user profile
export async function saveUserBoxTokens(
  userId: string,
  tokens: BoxOAuthTokens,
  userInfo: BoxUserInfo,
  accountType: 'new' | 'existing'
): Promise<void> {
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      box_email: userInfo.login,
      box_user_id: userInfo.id,
      box_oauth_token: tokens.access_token, // In production, encrypt this
      box_oauth_refresh_token: tokens.refresh_token, // In production, encrypt this
      box_oauth_expires_at: expiresAt.toISOString(),
      box_account_type: accountType
    })
    .eq('id', userId)

  if (error) {
    throw new Error(`Failed to save BOX tokens: ${error.message}`)
  }
}

// Get valid BOX access token for user (refresh if needed)
export async function getUserBoxToken(userId: string): Promise<string | null> {
  const { data: user, error } = await supabaseAdmin
    .from('users')
    .select('box_oauth_token, box_oauth_refresh_token, box_oauth_expires_at')
    .eq('id', userId)
    .single()

  if (error || !user || !user.box_oauth_token) {
    return null
  }

  // Check if token is still valid
  const expiresAt = new Date(user.box_oauth_expires_at)
  const now = new Date()

  if (now < expiresAt) {
    return user.box_oauth_token
  }

  // Token expired, try to refresh
  if (user.box_oauth_refresh_token) {
    try {
      const tokens = await refreshBoxToken(user.box_oauth_refresh_token)
      const newExpiresAt = new Date(Date.now() + tokens.expires_in * 1000)

      await supabaseAdmin
        .from('users')
        .update({
          box_oauth_token: tokens.access_token,
          box_oauth_refresh_token: tokens.refresh_token,
          box_oauth_expires_at: newExpiresAt.toISOString()
        })
        .eq('id', userId)

      return tokens.access_token
    } catch (refreshError) {
      console.error('Failed to refresh BOX token:', refreshError)
      return null
    }
  }

  return null
}

// Add user to BOX folder with specific permissions
export async function addUserToBoxFolder(
  folderId: string,
  userBoxId: string,
  role: 'viewer' | 'editor' | 'uploader' = 'editor'
): Promise<void> {
  const accessToken = await getAppAuthAccessToken() // Use enterprise token for management

  const body = {
    item: { id: folderId, type: 'folder' },
    accessible_by: { id: userBoxId, type: 'user' },
    role
  }

  const res = await fetch('https://api.box.com/2.0/collaborations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errorText = await res.text()
    throw new Error(`BOX collaboration creation failed ${res.status}: ${errorText}`)
  }
}

// Import the enterprise token function from existing box.ts
import { getAppAuthAccessToken } from './box'