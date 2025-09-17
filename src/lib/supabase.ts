import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rxnozwuamddqlcwysxag.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc3NjY4MDMsImV4cCI6MjA3MzM0MjgwM30.0sbl6zWJ1XalGTFbsgeMpth6yH-oQA_P1eTCc8lKoAU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for server-side operations
export const createSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://rxnozwuamddqlcwysxag.supabase.co'
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bm96d3VhbWRkcWxjd3lzeGFnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc2NjgwMywiZXhwIjoyMDczMzQyODAzfQ.w7KcFrtcTRhqoHwTSlgTc6NDNHIJH985rAgT9bD0ipE'

  return createClient(
    supabaseUrl,
    supabaseServiceKey,
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
  experience_years?: string
  member_level?: 'beginner' | 'intermediate' | 'advanced'
  avatar_url?: string
  rating?: number
  formal_name?: string
  postal_code?: string
  address?: string
  address_detail?: string
  phone_number?: string
  company_number?: string
  registration_number?: string
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
  role: 'Admin' | 'OrgAdmin' | 'Staff' | 'Contractor' | 'Reviewer' | 'Auditor'
  created_at: string
}

export type UserRole = 'Admin' | 'OrgAdmin' | 'Staff' | 'Contractor' | 'Reviewer' | 'Auditor'

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