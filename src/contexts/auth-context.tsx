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
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('AuthProvider: セッション取得エラー:', error)
          setLoading(false)
          return
        }

        
        setUser(session?.user ?? null)

        if (session?.user && session?.access_token) {
          // setTimeoutで次のイベントループで実行（React Strict Mode対策）
          setTimeout(() => {
            fetchUserProfile(session.user.id)
          }, 0)
        } else {
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
        setUser(session?.user ?? null)

        if (session?.user && event === 'SIGNED_IN') {
          // ログイン時のみプロフィールを取得（重複を避ける）
          // setTimeoutで次のイベントループで実行（React Strict Mode対策）
          setTimeout(() => {
            fetchUserProfile(session.user.id)
          }, 0)
        } else if (event === 'SIGNED_OUT') {
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
    // 重複実行を防ぐ
    if (fetchingRef.current === authUserId) {
      return
    }

    fetchingRef.current = authUserId

    try {
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError)
        // プロフィールが見つからない場合でも続行
      }

      setUserProfile(profile)

      // Fetch user role and organization from memberships
      // プロフィールがある場合はprofile.id、ない場合はauthUserIdを使用
      const userId = profile?.id || authUserId
      
      const { data: membership, error: roleError } = await supabase
        .from('memberships')
        .select('role, org_id')
        .eq('user_id', userId)
        .single()

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError)
        return
      }

      // ロールの解決
      let resolvedRole: any = membership?.role || null

      // メンバーシップが無い場合は、管理者メールのフォールバックで Admin 扱い
      try {
        if (!resolvedRole) {
          const { data: authUserInfo } = await supabase.auth.getUser()
          const email = authUserInfo.user?.email || profile?.email || ''
          const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || 'admin@demo.com')
            .split(',')
            .map(e => e.trim().toLowerCase())
          if (email && adminEmails.includes(email.toLowerCase())) {
            resolvedRole = 'Admin'
          }
        }
      } catch (_) {
        // 取得失敗時は無視
      }

      setUserRole(resolvedRole || null)
      
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

      // プロフィールがない場合（発注者の場合）は基本的な情報を作成
      if (!profile && membership) {
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          setUserProfile({
            id: authUserId,
            auth_user_id: authUserId,
            display_name: authUser.user.email?.split('@')[0] || '管理者',
            email: authUser.user.email || '',
            specialties: [],
            qualifications: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        }
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
    } finally {
      // 実行完了後にfetchingRefをクリア
      fetchingRef.current = null
      setLoading(false) // ローディング状態を解除
    }
  }

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    try {
      
      // タイムアウト処理を追加
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('認証タイムアウト（30秒）')), 30000)
      })
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise]) as any
      
      if (error) throw error
      
      // 認証成功後、ユーザープロフィールを手動で取得
      if (data?.user) {
        // fetchUserProfileを直接呼び出さず、setTimeoutで遅延実行
        setTimeout(() => {
          fetchUserProfile(data.user.id)
        }, 50)
      }
      
    } catch (error) {
      console.error('signIn: 認証エラー', error)
      throw error
    } finally {
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

      setUserProfile({ ...userProfile, ...updates })
    } catch (error) {
      console.error('Error updating profile:', error)
      throw error
    }
  }

  const getRedirectPath = () => {
    if (!userRole) return '/dashboard'
    
    switch (userRole) {
      case 'Admin':
        return '/admin/users'
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