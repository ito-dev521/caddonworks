import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const createSupabaseAdmin = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Database types
export interface User {
  id: string
  auth_user_id: string
  display_name: string
  email: string
  specialties: string[]
  qualifications: string[]
  portfolio_url?: string
  rating?: number
  created_at: string
  updated_at: string
}

export interface Organization {
  id: string
  name: string
  description?: string
  billing_email?: string
  system_fee: number
  active: boolean
  created_at: string
  updated_at: string
}

export interface Membership {
  id: string
  org_id: string
  user_id: string
  role: 'OrgAdmin' | 'Staff' | 'Contractor' | 'Reviewer' | 'Auditor'
  created_at: string
}

export type UserRole = 'OrgAdmin' | 'Staff' | 'Contractor' | 'Reviewer' | 'Auditor'

// Auth helpers
export const getCurrentUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) throw error
  return user
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  return data
}

export const signUp = async (email: string, password: string, userData: Partial<User>) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userData
    }
  })
  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const resetPassword = async (email: string) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`
  })
  if (error) throw error
  return data
}