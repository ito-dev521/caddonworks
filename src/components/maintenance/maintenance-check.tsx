"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { usePathname } from "next/navigation"
import { isMaintenanceMode, isAdminEmail } from "@/lib/maintenance"
import { MaintenancePage } from "@/components/maintenance/maintenance-page"
import { useAuth } from "@/contexts/auth-context"

interface MaintenanceCheckProps {
  children: React.ReactNode
}

export function MaintenanceCheck({ children }: MaintenanceCheckProps) {
  const { user } = useAuth()
  const pathname = usePathname()
  const [maintenanceActive, setMaintenanceActive] = useState(false)
  const [maintenanceLoading, setMaintenanceLoading] = useState(true)

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const maintenance = await isMaintenanceMode()
        setMaintenanceActive(maintenance)
      } catch (error) {
        console.error('メンテナンスモード確認エラー:', error)
        setMaintenanceActive(false)
      } finally {
        setMaintenanceLoading(false)
      }
    }

    checkMaintenance()
  }, [])

  if (maintenanceLoading) {
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
            システム状態確認中...
          </h2>
          <p className="text-gray-600">しばらくお待ちください</p>
        </motion.div>
      </div>
    )
  }

  // 管理者用ログインルートと通常ログインルートは常にアクセス可能
  if (pathname === '/auth/admin-login' || pathname === '/auth/login') {
    return <>{children}</>
  }

  // メンテナンスモードが有効で、管理者でない場合はメンテナンス画面を表示
  if (maintenanceActive) {
    // ログイン済みの管理者の場合のみ通常処理を続行
    if (user?.email && isAdminEmail(user.email)) {
      return <>{children}</>
    }
    // それ以外（未ログイン、一般ユーザー）はメンテナンス画面
    return <MaintenancePage />
  }

  return <>{children}</>
}