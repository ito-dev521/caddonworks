"use client"

import React, { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2, Shield } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import { UserRole } from "@/lib/supabase"

interface AuthGuardProps {
  children: React.ReactNode
  requiredRole?: UserRole
  redirectTo?: string
}

export function AuthGuard({
  children,
  requiredRole,
  redirectTo = "/auth/login"
}: AuthGuardProps) {
  const { user, userRole, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading) {
      if (!user) {
        // Store the attempted URL for redirect after login
        sessionStorage.setItem('redirectAfterLogin', pathname)
        router.push(redirectTo)
        return
      }

      if (requiredRole && userRole !== requiredRole) {
        // User doesn't have the required role
        router.push("/unauthorized")
        return
      }
    }
  }, [user, userRole, loading, requiredRole, router, redirectTo, pathname])

  if (loading) {
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
          <h2 className="text-xl font-semibold text-gray-900 mb-2">認証確認中...</h2>
          <p className="text-gray-600">しばらくお待ちください</p>
        </motion.div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect to login
  }

  if (requiredRole && userRole !== requiredRole) {
    return null // Will redirect to unauthorized page
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