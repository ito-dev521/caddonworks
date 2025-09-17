"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase, User, UserRole, getCurrentUser } from '@/lib/supabase'

interface AuthContextType {
  user: SupabaseUser | null
  userProfile: User | null
  userRole: UserRole | null
  userOrganization: { id: string; name: string } | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, userData: Partial<User>) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  getRedirectPath: () => string
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [userProfile, setUserProfile] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userOrganization, setUserOrganization] = useState<{ id: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const fetchingRef = useRef<string | null>(null)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        console.log('AuthProvider: 初期セッション取得開始')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: セッション取得エラー:', error)
          setLoading(false)
          return
        }

        console.log('AuthProvider: セッション取得結果:', { 
          hasSession: !!session, 
          userId: session?.user?.id,
          hasAccessToken: !!session?.access_token,
          tokenLength: session?.access_token?.length
        })
        
        setUser(session?.user ?? null)

        if (session?.user && session?.access_token) {
          console.log('🚀 AuthProvider: 初期セッション - ユーザープロフィール取得開始')
          // setTimeoutで次のイベントループで実行（React Strict Mode対策）
          setTimeout(() => {
            console.log('⏱️ setTimeout実行: fetchUserProfile呼び出し (初期セッション)')
            fetchUserProfile(session.user.id)
          }, 0)
        } else {
          console.log('AuthProvider: セッションまたはトークンなし、ローディング終了')
          setLoading(false)
        }
      } catch (error) {
        console.error('AuthProvider: 初期化エラー:', error)
        // エラーが発生してもローディング状態を解除
        setUser(null)
        setUserProfile(null)
        setUserRole(null)
        setUserOrganization(null)
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const timestamp = new Date().toISOString()
        console.log(`🔄 [${timestamp}] Auth state change:`, {
          event,
          userId: session?.user?.id,
          hasToken: !!session?.access_token
        })
        setUser(session?.user ?? null)

        if (session?.user && event === 'SIGNED_IN') {
          // ログイン時のみプロフィールを取得（重複を避ける）
          console.log(`🔑 [${timestamp}] Auth state change: SIGNED_IN, fetching profile`)
          // setTimeoutで次のイベントループで実行（React Strict Mode対策）
          setTimeout(() => {
            console.log(`⏱️ [${timestamp}] setTimeout実行: fetchUserProfile呼び出し (SIGNED_IN)`)
            fetchUserProfile(session.user.id)
          }, 0)
        } else if (event === 'SIGNED_OUT') {
          console.log('Auth state change: SIGNED_OUT, clearing profile')
          setUserProfile(null)
          setUserRole(null)
          setUserOrganization(null)
        }
        
        // ローディング状態を更新（初期化後は常にfalse）
        if (event !== 'INITIAL_SESSION') {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, []) // fetchUserProfileを依存配列から削除

  const fetchUserProfile = async (authUserId: string) => {
    const timestamp = new Date().toISOString()
    const callStack = new Error().stack?.split('\n').slice(1, 4).join(' -> ')
    console.log(`🔍 [${timestamp}] fetchUserProfile: 開始`, {
      authUserId,
      fetchingRef: fetchingRef.current,
      callStack
    })

    // 重複実行を防ぐ
    if (fetchingRef.current === authUserId) {
      console.log(`⚠️ [${timestamp}] fetchUserProfile: 既に実行中のためスキップ`, { authUserId })
      return
    }

    fetchingRef.current = authUserId
    console.log(`🏃 [${timestamp}] fetchUserProfile: 実行開始`, { authUserId })

    try {
      // Fetch user profile
      console.log('fetchUserProfile: ユーザープロフィール取得開始')
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      console.log('fetchUserProfile: ユーザープロフィール結果', { profile: profile?.id, error: profileError?.message })

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError)
        return
      }

      setUserProfile(profile)

      // Fetch user role and organization from memberships
      if (profile) {
        console.log('fetchUserProfile: メンバーシップ取得開始', { profileId: profile.id })
        const { data: membership, error: roleError } = await supabase
          .from('memberships')
          .select('role, org_id')
          .eq('user_id', profile.id)
          .single()

        console.log('fetchUserProfile: メンバーシップ結果', { 
          role: membership?.role, 
          org_id: membership?.org_id,
          error: roleError?.message 
        })

        if (roleError && roleError.code !== 'PGRST116') {
          console.error('Error fetching user role:', roleError)
          return
        }

        setUserRole(membership?.role || null)
        
        // 組織情報を取得
        if (membership?.org_id) {
          const { data: orgData, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('id', membership.org_id)
            .single()
          
          if (orgError) {
            console.error('Error fetching organization:', orgError)
            setUserOrganization(null)
          } else {
            setUserOrganization({
              id: orgData.id,
              name: orgData.name
            })
          }
        } else {
          setUserOrganization(null)
        }
        
        console.log('fetchUserProfile: 完了', {
          role: membership?.role,
          organization: membership?.org_id
        })
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    } finally {
      // 実行完了後にfetchingRefをクリア
      fetchingRef.current = null
      setLoading(false) // ローディング状態を解除
      console.log(`✅ [${timestamp}] fetchUserProfile: 実行完了`, { authUserId })
    }
  }

  const signIn = async (email: string, password: string) => {
    console.log('signIn: 開始', { email })
    setLoading(true)
    try {
      console.log('signIn: Supabase認証開始')
      
      // タイムアウト処理を追加
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('認証タイムアウト（30秒）')), 30000)
      })
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any
      
      console.log('signIn: Supabase認証結果', { data: data?.user?.id, error: error?.message })
      if (error) throw error
      console.log('signIn: 認証成功')
      
      // 認証成功後、ユーザープロフィールを手動で取得
      if (data?.user) {
        console.log('signIn: ユーザープロフィール取得開始')
        // fetchUserProfileを直接呼び出さず、setTimeoutで遅延実行
        setTimeout(() => {
          fetchUserProfile(data.user.id)
        }, 50)
        console.log('signIn: ユーザープロフィール取得完了')
      }
      
    } catch (error) {
      console.error('signIn: 認証エラー', error)
      throw error
    } finally {
      console.log('signIn: 終了')
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, userData: Partial<User>) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: userData.display_name,
            specialties: userData.specialties || [],
            qualifications: userData.qualifications || []
          }
        }
      })
      if (error) throw error

      // Create user profile after successful signup
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_user_id: data.user.id,
            email: data.user.email!,
            display_name: userData.display_name || '',
            specialties: userData.specialties || [],
            qualifications: userData.qualifications || [],
            experience_years: userData.experience_years
          })

        if (profileError) {
          console.error('Error creating user profile:', profileError)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setUserProfile(null)
      setUserRole(null)
    } finally {
      setLoading(false)
    }
  }

  const updateProfile = async (updates: Partial<User>) => {
    if (!userProfile) {
      console.error('updateProfile: userProfile is null')
      throw new Error('ユーザープロフィールが見つかりません')
    }

    try {
      console.log('updateProfile: 更新開始', { userId: userProfile.id, updates })
      
      const { data, error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', userProfile.id)
        .select()
        .single()

      if (error) {
        console.error('updateProfile: Supabaseエラー', error)
        throw error
      }

      console.log('updateProfile: 更新成功', data)
      setUserProfile({ ...userProfile, ...updates })
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const getRedirectPath = () => {
    if (!userRole) return '/dashboard'
    
    switch (userRole) {
      case 'Contractor':
        return '/jobs'
      case 'OrgAdmin':
        return '/projects'
      case 'Reviewer':
        return '/reviews'
      default:
        return '/dashboard'
    }
  }

  const value: AuthContextType = {
    user,
    userProfile,
    userRole,
    userOrganization,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    getRedirectPath,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}