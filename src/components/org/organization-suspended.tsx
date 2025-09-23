'use client'

import { motion } from "framer-motion"
import { AlertTriangle, Building2, Mail, Phone } from "lucide-react"
import { OrganizationStatus } from "@/lib/organization-status"
import { useAuth } from "@/contexts/auth-context"

interface OrganizationSuspendedProps {
  organizationStatus: OrganizationStatus
  message: string
}

export function OrganizationSuspended({ organizationStatus, message }: OrganizationSuspendedProps) {
  const { signOut } = useAuth()

  const handleSignOut = async () => {
    try {
      // AuthContextを使用してサインアウト
      await signOut()

      // ローカルストレージとセッションストレージをクリア
      localStorage.clear()
      sessionStorage.clear()

      // 少し待ってからリダイレクト（状態更新を待つ）
      setTimeout(() => {
        window.location.replace('/auth/login')
      }, 100)
    } catch (error) {
      console.error('ログアウトエラー:', error)
      // エラーが発生してもログインページにリダイレクト
      localStorage.clear()
      sessionStorage.clear()
      window.location.replace('/auth/login')
    }
  }

  const handleContactSupport = () => {
    const email = 'support@example.com'
    const subject = `組織利用制限について - ${organizationStatus.name}`
    const body = `組織名: ${organizationStatus.name}\n組織ID: ${organizationStatus.id}\n\nお問い合わせ内容:\n`

    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
  }

  return (
    <div className="min-h-screen bg-gradient-mesh flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-orange-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          サービス利用制限
        </h1>

        <div className="flex items-center justify-center gap-2 text-gray-600 mb-4">
          <Building2 className="w-4 h-4" />
          <span className="text-sm">{organizationStatus.name}</span>
        </div>

        <p className="text-gray-700 mb-6 leading-relaxed">
          {message}
        </p>

        <div className="space-y-3">
          <button
            onClick={handleContactSupport}
            className="w-full bg-engineering-blue text-white px-6 py-3 rounded-lg hover:bg-engineering-blue/90 transition-colors flex items-center justify-center gap-2"
          >
            <Mail className="w-4 h-4" />
            サポートに問い合わせ
          </button>

          <button
            onClick={handleSignOut}
            className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ログアウト
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-xs text-gray-500 space-y-1">
            <div>組織ID: {organizationStatus.id}</div>
            <div>
              状態: {!organizationStatus.active && "停止中"}
              {organizationStatus.approval_status === 'pending' && "承認待ち"}
              {organizationStatus.approval_status === 'rejected' && "承認却下"}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}