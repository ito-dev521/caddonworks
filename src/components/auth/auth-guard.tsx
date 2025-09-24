"use client"

import React, { useEffect, useRef, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, Shield } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "@/lib/supabase"
import { checkOrganizationStatus, getOrganizationStatusMessage, OrganizationStatus } from "@/lib/organization-status"
import { OrganizationSuspended } from "@/components/org/organization-suspended"
import { isMaintenanceMode, isAdminEmail } from "@/lib/maintenance"
import { MaintenancePage } from "@/components/maintenance/maintenance-page"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
  redirectTo?: string
  skipOrganizationCheck?: boolean
}

export function AuthGuard({
  children,
  requiredRole,
  allowedRoles,
  redirectTo = "/auth/login",
  skipOrganizationCheck = false
}: AuthGuardProps) {
  const { user, userRole, loading, signOut, userOrganization } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const isRedirectingRef = useRef(false)
  const [organizationStatus, setOrganizationStatus] = useState<OrganizationStatus | null>(null)
  const [organizationLoading, setOrganizationLoading] = useState(false)
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)

  useEffect(() => {
    // ローディング中は何もしない
    if (loading) {
      return
    }

    if (isRedirectingRef.current) return

    if (!user) {
      // Store the attempted URL for redirect after login
      sessionStorage.setItem('redirectAfterLogin', pathname)
      if (pathname !== redirectTo) {
        isRedirectingRef.current = true
        router.push(redirectTo)
      }
      return
    }

    // Check role permissions
    if (requiredRole && userRole !== requiredRole) {
      // ロール不一致: 強制サインアウトしてログインへ
      if (!isRedirectingRef.current) {
        (async () => {
          try {
            isRedirectingRef.current = true
            sessionStorage.removeItem('redirectAfterLogin')
            sessionStorage.removeItem('previousPage')
            sessionStorage.removeItem('currentPage')
            await signOut()
          } finally {
            router.push('/auth/login')
          }
        })()
      }
      return
    }

    if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
      // 許可されていないロール: 強制サインアウトしてログインへ
      if (!isRedirectingRef.current) {
        (async () => {
          try {
            isRedirectingRef.current = true
            sessionStorage.removeItem('redirectAfterLogin')
            sessionStorage.removeItem('previousPage')
            sessionStorage.removeItem('currentPage')
            await signOut()
          } finally {
            router.push('/auth/login')
          }
        })()
      }
      return
    }
  }, [user, userRole, loading, requiredRole, allowedRoles, router, redirectTo, pathname])

  // メンテナンスモードチェック
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // 管理者ログインページは常に除外
        if (pathname === '/auth/admin-login') {
          setMaintenanceActive(false)
          setMaintenanceLoading(false)
          return
        }

        if (!loading) {
          const maintenance = await isMaintenanceMode()
          setMaintenanceActive(maintenance)
        }
      } catch (error) {
        console.error('メンテナンスモード確認エラー:', error)
        setMaintenanceActive(false)
      } finally {
        setMaintenanceLoading(false)
      }
    }

    if (!loading) {
      checkMaintenance()
    } else {
      setMaintenanceLoading(true)
    }
  }, [loading, pathname])

  // 組織状態チェック
  useEffect(() => {
    const checkOrgStatus = async () => {
      if (!user || !userOrganization || skipOrganizationCheck || loading) {
        return
      }

      // 受注者は組織に所属しないため、組織チェックをスキップ
      if (userRole === 'Contractor') {
        return
      }

      // 管理者関連ページまたはログイン関連ページは組織チェックをスキップ
      const isAdminPage = pathname.startsWith('/admin')
      const isAuthPage = pathname.startsWith('/auth')
      if (isAdminPage || isAuthPage) {
        return
      }

      setOrganizationLoading(true)
      try {
        const status = await checkOrganizationStatus(userOrganization.id)
        setOrganizationStatus(status)
      } catch (error) {
        console.error('Failed to check organization status:', error)
      } finally {
        setOrganizationLoading(false)
      }
    }

    checkOrgStatus()
  }, [user, userOrganization, skipOrganizationCheck, loading, pathname, userRole])

  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-engineering-blue rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {maintenanceLoading ? 'システム状態確認中...' : '認証確認中...'}
          </h2>
          <p className="text-gray-600">しばらくお待ちください</p>
        </motion.div>
      </div>
    )
  }

  // メンテナンスモードが有効で、管理者でない場合はメンテナンス画面を表示
  if (maintenanceActive) {
    if (!user?.email || !isAdminEmail(user.email)) {
      return <MaintenancePage />
    }
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (requiredRole && userRole !== requiredRole) {
    return null // Will redirect to unauthorized page
  }

  if (allowedRoles && allowedRoles.length > 0 && (!userRole || !allowedRoles.includes(userRole))) {
    return null // Will redirect to unauthorized page
  }

  // 組織状態チェック中
  if (organizationLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 bg-engineering-blue rounded-xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">組織情報を確認中...</h2>
          <p className="text-gray-600">しばらくお待ちください</p>
        </motion.div>
      </div>
    )
  }

  // 組織が停止中または未承認の場合
  if (organizationStatus && (!organizationStatus.active || organizationStatus.approval_status !== 'approved')) {
    const message = getOrganizationStatusMessage(organizationStatus)
    return <OrganizationSuspended organizationStatus={organizationStatus} message={message} />
  }

  return <>{children}</>
}

// Higher-order component for role-based access
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRole?: UserRole
) {
  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard requiredRole={requiredRole}>
        <Component {...props} />
      </AuthGuard>
    )
  }
}

// Hook for role-based rendering
export function useRoleAccess() {
  const { userRole } = useAuth()

  const hasRole = (role: UserRole) => userRole === role

  const hasAnyRole = (roles: UserRole[]) =>
    userRole ? roles.includes(userRole) : false

  const isAdmin = () => hasRole('OrgAdmin')
  const isStaff = () => hasRole('Staff')
  const isContractor = () => hasRole('Contractor')
  const isReviewer = () => hasRole('Reviewer')
  const isAuditor = () => hasRole('Auditor')

  const canManageProjects = () =>
    hasAnyRole(['OrgAdmin', 'Staff'])

  const canViewFinancials = () =>
    hasAnyRole(['OrgAdmin', 'Staff', 'Auditor'])

  const canReviewProjects = () =>
    hasAnyRole(['Reviewer', 'OrgAdmin'])

  const canViewAuditLogs = () =>
    hasAnyRole(['Auditor', 'OrgAdmin'])

  return {
    hasRole,
    hasAnyRole,
    isAdmin,
    isStaff,
    isContractor,
    isReviewer,
    isAuditor,
    canManageProjects,
    canViewFinancials,
    canReviewProjects,
    canViewAuditLogs,
  }
}