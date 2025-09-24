"use client"

import Link from "next/link"
import { Shield, Users, Building2, FileText, ScrollText, Settings, FolderLock } from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function AdminDashboardPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <Shield className="w-8 h-8 text-engineering-blue" />
                運営者ダッシュボード
              </h1>
              <p className="text-gray-600 mt-2">ユーザー・組織・請求・ログ・システム設定を一元管理します。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DashboardCard
                href="/admin/users"
                icon={<Users className="w-6 h-6" />}
                title="ユーザー管理"
                desc="全ユーザーの会員レベルや属性を管理"
              />
              <DashboardCard
                href="/admin/organizations"
                icon={<Building2 className="w-6 h-6" />}
                title="発注者の利用管理"
                desc="組織ごとの利用状況・承認・停止"
              />
              <DashboardCard
                href="/admin/invoices"
                icon={<FileText className="w-6 h-6" />}
                title="請求書管理"
                desc="請求の検索・状態更新・CSV出力"
              />
              <DashboardCard
                href="/admin/logs"
                icon={<ScrollText className="w-6 h-6" />}
                title="ログ管理"
                desc="操作ログの検索・エクスポート"
              />
              <DashboardCard
                href="/admin/system"
                icon={<Settings className="w-6 h-6" />}
                title="システム管理"
                desc="機能フラグやメンテナンス操作"
              />
              <DashboardCard
                href="/admin/box-permissions"
                icon={<FolderLock className="w-6 h-6" />}
                title="Box権限管理"
                desc="フォルダ別ダウンロード制限・ユーザー権限設定"
              />
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  )
}

function DashboardCard({ href, icon, title, desc }: { href: string; icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Link href={href} className="block">
      <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow h-full">
        <div className="flex items-center gap-3 mb-3 text-engineering-blue">{icon}<span className="font-semibold">{title}</span></div>
        <p className="text-sm text-gray-600">{desc}</p>
      </div>
    </Link>
  )
}
