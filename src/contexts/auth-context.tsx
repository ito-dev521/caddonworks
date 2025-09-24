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
    let mounted = true

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!mounted) return

        if (error) {
          console.error('AuthProvider: セッション取得エラー:', error)
          // セッションエラーの場合は完全にクリア
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
          setUserOrganization(null)
          setLoading(false)
          return
        }

        // デバッグログ削除

        setUser(session?.user ?? null)

        if (session?.user && session?.access_token) {
          // setTimeoutで次のイベントループで実行（React Strict Mode対策）
          setTimeout(() => {
            if (mounted) {
              fetchUserProfile(session.user.id)
            }
          }, 0)
        } else {
          setLoading(false)
        }
      } catch (error) {
        console.error('AuthProvider: 初期化エラー:', error)
        // エラーが発生した場合は完全にクリア
        if (mounted) {
          await supabase.auth.signOut()
          setUser(null)
          setUserProfile(null)
          setUserRole(null)
          setUserOrganization(null)
          setLoading(false)
        }
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

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // fetchUserProfileを依存配列から削除

  const fetchUserProfile = async (authUserId: string) => {
    // 重複実行を防ぐ
    if (fetchingRef.current === authUserId) {
      return
    }

    fetchingRef.current = authUserId
    // デバッグログ削除

    try {
      // まず現在のセッションを確認
      const { data: { session } } = await supabase.auth.getSession()
      if (!session || session.user.id !== authUserId) {
        setUser(null)
        setUserProfile(null)
        setUserRole(null)
        setUserOrganization(null)
        setLoading(false)
        return
      }
      // Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single()

      // デバッグログ削除

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching user profile:', profileError)
        // プロフィールが見つからない場合でも続行
      }

      // 表示名のフォールバック: 空なら氏名→メールローカル部の順で補完
      let normalizedProfile: any = profile ? { ...profile } : null
      if (normalizedProfile) {
        const currentDisplay = (normalizedProfile.display_name || '').trim()
        if (!currentDisplay) {
          try {
            const { data: authUserInfo } = await supabase.auth.getUser()
            const email = normalizedProfile.email || authUserInfo.user?.email || ''
            normalizedProfile.display_name = (normalizedProfile.formal_name || '').trim() || (email ? email.split('@')[0] : 'ユーザー')
          } catch {
            normalizedProfile.display_name = (normalizedProfile.formal_name || '').trim() || 'ユーザー'
          }
        }
      }
      setUserProfile(normalizedProfile)

      // Fetch user role and organization from memberships
      // プロフィールがある場合はprofile.id、ない場合はauthUserIdを使用
      const userId = profile?.id || authUserId

      const { data: memberships, error: roleError } = await supabase
        .from('memberships')
        .select('role, org_id')
        .eq('user_id', userId)

      // デバッグログ削除

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error fetching user role:', roleError)
        return
      }

      // ロールの解決（複数メンバーシップを考慮して優先度で選択）
      const priority: UserRole[] = ['OrgAdmin', 'Staff', 'Contractor', 'Reviewer', 'Auditor']
      const membershipsArray = Array.isArray(memberships) ? memberships : (memberships ? [memberships] : [])
      const pickByPriority = () => {
        for (const role of priority) {
          const found = membershipsArray.find((m: any) => m.role === role)
          if (found) return found
        }
        return membershipsArray[0] || null
      }
      const pickedMembership: any = pickByPriority()
      let resolvedRole: any = pickedMembership?.role || null

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
      const orgIdToLoad = pickedMembership?.org_id
      if (orgIdToLoad) {
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('id', orgIdToLoad)
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
      if (!profile && pickedMembership) {
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          setUserProfile({
            id: authUserId,
            auth_user_id: authUserId,
            display_name: authUser.user.email?.split('@')[0] || '管理者',
            formal_name: (authUser.user.email?.split('@')[0] || '管理者'),
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
      // デバッグログ削除
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

      if (error) {
        console.error('認証エラー詳細:', {
          message: error.message,
          status: error.status,
          code: error.code,
          email: email
        })

        // メール認証が完了していない場合のエラーハンドリング
        if (error.message?.includes('Email not confirmed')) {
          throw new Error('メールアドレスの認証が完了していません。受信したメールのリンクをクリックして認証を完了してください。')
        }

        // より詳細なエラーメッセージを提供
        if (error.message?.includes('Invalid login credentials')) {
          // デバッグ用API呼び出し（本番では削除推奨）
          try {
            const debugResponse = await fetch('/api/debug-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email })
            })
            const debugData = await debugResponse.json()
            console.log('ユーザーデバッグ情報:', debugData)

            if (!debugData.auth_user) {
              throw new Error('このメールアドレスは登録されていません')
            } else if (!debugData.user_profile && !debugData.user_profile_by_auth_id) {
              throw new Error('ユーザープロフィールが作成されていません。管理者にお問い合わせください。')
            } else if (debugData.memberships_count === 0) {
              throw new Error('組織メンバーシップが設定されていません。管理者にお問い合わせください。')
            } else {
              const inactiveOrgs = debugData.organizations?.filter((org: any) => !org.active || org.approval_status !== 'approved')
              if (inactiveOrgs && inactiveOrgs.length > 0) {
                throw new Error('所属組織が承認されていません。運営者による承認をお待ちください。')
              }
            }
          } catch (debugError) {
            console.error('デバッグエラー:', debugError)
            if (debugError instanceof Error && debugError.message !== 'このメールアドレスは登録されていません') {
              throw debugError
            }
          }
        }

        throw error
      }

      // メール認証状態をチェック（本番環境のみ）
      const isDevelopment = process.env.NODE_ENV === 'development'
      if (!isDevelopment && data?.user && !data.user.email_confirmed_at) {
        await supabase.auth.signOut()
        throw new Error('メールアドレスの認証が完了していません。受信したメールのリンクをクリックして認証を完了してください。')
      }

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
    // デバッグログ削除
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
      // デバッグログ削除
      if (error) throw error

      // Create user profile after successful signup
      if (data.user) {
        // デバッグログ削除
        const profileData = {
          auth_user_id: data.user.id,
          email: data.user.email!,
          display_name: userData.display_name || '',
          formal_name: userData.formal_name || '',
          organization: userData.organization || '',
          specialties: userData.specialties || [],
          qualifications: userData.qualifications || [],
          experience_years: userData.experience_years
        }
        // デバッグログ削除

        const { data: insertedProfile, error: profileError } = await supabase
          .from('users')
          .insert(profileData)
          .select()
          .single()

        // デバッグログ削除
        if (profileError) {
          console.error('Error creating user profile:', profileError)
          throw new Error(`プロフィール作成に失敗しました: ${profileError.message}`)
        } else {
          // デバッグログ削除

          // メンバーシップ作成の内部関数
          const createMembership = async (userId: string, orgId: string) => {
            const { data: membership, error: membershipError } = await supabase
              .from('memberships')
              .insert({
                user_id: userId,
                org_id: orgId,
                role: 'Contractor'
              })
              .select()
              .single()

            // デバッグログ削除
            if (membershipError) {
              console.error('Error creating membership:', membershipError)
              throw new Error(`メンバーシップ作成に失敗しました: ${membershipError.message}`)
            } else {
            }
          }

          // 新規受注者を受注者向け組織にContractorとして追加
          const { data: contractorOrg, error: orgError } = await supabase
            .from('organizations')
            .select('id, name')
            .eq('name', '個人事業主（受注者）')
            .single()

          if (orgError) {
            console.error('signUp: 受注者組織取得エラー', orgError)
            // 受注者組織が見つからない場合は作成する
            const { data: newOrg, error: createError } = await supabase
              .from('organizations')
              .insert({
                name: '個人事業主（受注者）',
                description: '受注者向けのデフォルト組織',
                system_fee: 0.1,
                active: true
              })
              .select()
              .single()

            if (createError) {
              console.error('signUp: 受注者組織作成エラー', createError)
              // 最終的に他の組織を使用
              const { data: fallbackOrg } = await supabase
                .from('organizations')
                .select('id')
                .limit(1)
                .single()

              if (fallbackOrg) {
                await createMembership(insertedProfile.id, fallbackOrg.id)
              } else {
                // 組織が見つからない場合はスキップ
              }
            } else {
              await createMembership(insertedProfile.id, newOrg.id)
            }
          } else {
            await createMembership(insertedProfile.id, contractorOrg.id)
          }
        }
      } else {
        // デバッグログ削除
      }
    } catch (error) {
      console.error('signUp: エラー', error)
      throw error
    } finally {
      setLoading(false)
      // デバッグログ削除
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
    // 発注者(OrgAdmin/Staff)は案件管理へ、受注者は案件一覧へ
    if (!userRole) return '/dashboard'
    if (userRole === 'OrgAdmin' || userRole === 'Staff') return '/projects'
    if (userRole === 'Contractor') return '/jobs'
    if (userRole === 'Admin') return '/admin/users'
    if (userRole === 'Reviewer') return '/reviews'
    return '/dashboard'
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