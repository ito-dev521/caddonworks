"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home,
  FolderOpen,
  Users,
  FileText,
  BarChart3,
  Settings,
  Bell,
  Search,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  MessageCircle,
  Star,
  Box,
  Building2,
  FolderLock,
  Calendar
} from "lucide-react"
import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { useRoleAccess } from "../auth/auth-guard"
import { cn } from "@/lib/utils"
import { NotificationBell } from "../notifications/notification-bell"
import { useNavigationBadges } from "@/hooks/use-navigation-badges"
import { getOrganizationDisplayName } from "@/lib/organization-utils"

// interface NavigationProps {
//   userRole?: "Admin" | "OrgAdmin" | "Staff" | "Contractor" | "Reviewer" | "Auditor"
// }

const getNavigationItems = (userRole: string, badges: any) => {
  const baseItems = {
    Admin: [
      { icon: Home, label: "ダッシュボード", href: "/dashboard", badge: null },
      { icon: Users, label: "ユーザー管理", href: "/admin/users", badge: null },
      { icon: Building2, label: "会社管理・承認", href: "/admin/organizations", badge: badges.organizations || null },
      { icon: User, label: "個人事業主管理", href: "/admin/contractors", badge: null },
      { icon: Calendar, label: "月次請求書管理", href: "/admin/monthly-billing", badge: null },
      { icon: FileText, label: "請求書管理", href: "/admin/invoices", badge: null },
      { icon: FolderLock, label: "Box権限管理", href: "/admin/box-permissions", badge: null },
      { icon: BarChart3, label: "統計・レポート", href: "/admin/reports", badge: null },
      { icon: Settings, label: "システム設定", href: "/admin/settings", badge: null },
    ],
    OrgAdmin: [
      { icon: Home, label: "ダッシュボード", href: "/dashboard", badge: null },
      { icon: FolderOpen, label: "案件管理", href: "/projects", badge: badges.projects || null },
      { icon: MessageCircle, label: "チャット", href: "/chat", badge: badges.chat || null },
      { icon: FileText, label: "契約管理", href: "/contracts", badge: badges.contracts || null },
      { icon: Box, label: "ファイル管理", href: "/project-files", badge: null },
      { icon: BarChart3, label: "会計・請求", href: "/billing", badge: "新" },
      { icon: Users, label: "お気に入り会員", href: "/favorite-members", badge: null },
      { icon: Settings, label: "設定", href: "/settings", badge: null },
    ],
    Staff: [
      { icon: FolderOpen, label: "案件管理", href: "/projects", badge: badges.projects || null },
      { icon: MessageCircle, label: "チャット", href: "/chat", badge: badges.chat || null },
      { icon: FileText, label: "契約管理", href: "/contracts", badge: badges.contracts || null },
      { icon: Box, label: "ファイル管理", href: "/project-files", badge: null },
      { icon: Users, label: "お気に入り会員", href: "/favorite-members", badge: null },
    ],
    Contractor: [
      { icon: FolderOpen, label: "案件一覧", href: "/jobs", badge: badges.jobs || null },
      { icon: MessageCircle, label: "チャット", href: "/chat", badge: badges.chat || null },
      { icon: FileText, label: "契約管理", href: "/contracts", badge: badges.contracts || null },
      { icon: Star, label: "受注者評価", href: "/evaluations", badge: null },
      { icon: FileText, label: "請求書・報酬", href: "/invoices", badge: null },
    ],
    Reviewer: [
      { icon: Home, label: "ダッシュボード", href: "/dashboard", badge: null },
      { icon: FolderOpen, label: "審査案件", href: "/reviews", badge: badges.reviews || null },
      { icon: MessageCircle, label: "チャット", href: "/chat", badge: badges.chat || null },
      { icon: FileText, label: "評価履歴", href: "/evaluations", badge: null },
    ],
    Auditor: [
      { icon: Home, label: "ダッシュボード", href: "/dashboard", badge: null },
      { icon: FileText, label: "監査ログ", href: "/audit-logs", badge: null },
      { icon: MessageCircle, label: "チャット", href: "/chat", badge: null },
      { icon: BarChart3, label: "レポート", href: "/reports", badge: null },
    ]
  }

  return baseItems[userRole as keyof typeof baseItems] || baseItems.Admin
}

interface NavigationProps {
  onExpandedChange?: (expanded: boolean) => void
}

export function Navigation({ onExpandedChange }: NavigationProps = {}) {
  const { user, userProfile, userRole, userOrganization, signOut } = useAuth()
  const { badges } = useNavigationBadges()

  const router = useRouter()
  const pathname = usePathname()
  const [isExpanded, setIsExpanded] = useState(true)

  // 展開状態が変更されたときに親コンポーネントに通知
  useEffect(() => {
    onExpandedChange?.(isExpanded)
  }, [isExpanded, onExpandedChange])
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [organizationContactPerson, setOrganizationContactPerson] = useState<string | null>(null)
  const hasFetchedOrganization = useRef(false)

  // 共有Supabaseクライアントを使用（重複インスタンス防止）

  // ページ遷移を記録
  useEffect(() => {
    const currentPath = pathname
    const previousPath = sessionStorage.getItem('currentPage')
    
    // 現在のページを記録
    sessionStorage.setItem('currentPage', currentPath)
    
    // 前のページが存在し、現在のページと異なる場合は記録
    if (previousPath && previousPath !== currentPath) {
      sessionStorage.setItem('previousPage', previousPath)
    }
  }, [pathname])

  // 組織の担当者名を取得（OrgAdminの場合のみ）- 無限ループ防止版
  useEffect(() => {
    const fetchOrganizationContactPerson = async () => {
      // より厳密な条件チェック
      if (userRole !== 'OrgAdmin' || !userOrganization?.id || organizationContactPerson !== null) {
        return
      }

      // 既に実行中の場合はスキップ
      if (hasFetchedOrganization.current) {
        return
      }

      hasFetchedOrganization.current = true

      try {
        // Supabaseから認証トークンを取得
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.access_token) {
          console.error('認証トークンが取得できません')
          hasFetchedOrganization.current = false
          return
        }

        // 非同期でバックグラウンド取得（ページ遷移をブロックしない）
        const response = await fetch('/api/organization/profile', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (response.ok) {
          const data = await response.json()
          if (data.organization) {
            // APIは representative_name を返す。互換のため contact_person もフォールバック
            setOrganizationContactPerson(
              data.organization?.representative_name ||
              data.organization?.contact_person ||
              null
            )
          }
        } else {
          console.error('組織情報API失敗:', response.status)
          hasFetchedOrganization.current = false
        }
      } catch (error) {
        console.error('組織情報の取得に失敗しました:', error)
        hasFetchedOrganization.current = false
      }
    }

    // OrgAdminかつ組織IDが存在し、まだ担当者情報を取得していない場合のみ実行
    if (userRole === 'OrgAdmin' && userOrganization?.id && organizationContactPerson === null && !hasFetchedOrganization.current) {
      fetchOrganizationContactPerson()
    }
  }, [userRole, userOrganization?.id, organizationContactPerson]) // organizationContactPersonも依存配列に追加

  const navItems = getNavigationItems(userRole || 'Admin', badges)

  // 表示名を決定（OrgAdminの場合は担当者名を優先）
  const getDisplayName = () => {
    if (userRole === 'OrgAdmin') {
      const displayName = organizationContactPerson || userProfile?.display_name || 'ユーザー'
      return displayName
    }
    return userProfile?.display_name || 'ユーザー'
  }

  // サブラベルはログイン中のユーザー情報（メール）を優先表示
  const getSubLabel = () => {
    return user?.email || userProfile?.email || ''
  }

  return (
    <>
      {/* Desktop Navigation */}
      <motion.nav
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className={cn(
          "hidden md:flex fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-[1000] transition-all duration-300 shadow-lg",
          isExpanded ? "w-64" : "w-16"
        )}
      >
        <div className="flex flex-col w-full">
          {/* Header */}
          <div className={cn(
            "border-b border-gray-200 bg-white",
            isExpanded ? "p-4" : "p-1 space-y-1"
          )}>
            {isExpanded ? (
              <div className="flex items-center justify-between">
                <motion.div
                  className="flex items-center gap-3"
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  <div>
                    <h1 className="font-bold text-lg text-engineering-blue">
                      CADDONプラットフォーム
                    </h1>
                    <p className="text-xs text-gray-500">Civil Engineering</p>
                  </div>
                </motion.div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <Menu className="w-4 h-4" />
                  </Button>
                  {user && <NotificationBell />}
                </div>
              </div>
            ) : (
              <>
                <div className="px-2 py-2 rounded-lg hover:bg-engineering-blue/10 text-gray-600 hover:text-engineering-blue flex items-center justify-center cursor-pointer"
                     onClick={() => setIsExpanded(!isExpanded)}>
                  <Menu className="w-5 h-5" />
                </div>
                {user && (
                  <div className="px-2 py-2 rounded-lg hover:bg-engineering-blue/10 text-gray-600 hover:text-engineering-blue flex items-center justify-center">
                    <NotificationBell />
                  </div>
                )}
              </>
            )}
          </div>

          {/* Navigation Items */}
          <div className="flex-1 px-2 py-4 space-y-2">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={item.href}>
                  <div className={cn(
                    "flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-engineering-blue/10 transition-colors group relative",
                    "hover-lift"
                  )}>
                    <item.icon className="w-5 h-5 text-gray-600 group-hover:text-engineering-blue" />
                    <motion.span
                      className="text-gray-700 group-hover:text-engineering-blue font-medium"
                      animate={{ opacity: isExpanded ? 1 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      {isExpanded ? item.label : ""}
                    </motion.span>
                    {item.badge && isExpanded && (typeof item.badge !== 'number' || item.badge > 0) && (
                      <Badge
                        variant="engineering"
                        className="ml-auto text-xs"
                      >
                        {item.badge}
                      </Badge>
                    )}

                    {/* Tooltip for collapsed state */}
                    {!isExpanded && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[1001]">
                        {item.label}
                      </div>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200">
            <div className="relative group">
              <motion.div
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                animate={{ justifyContent: isExpanded ? "flex-start" : "center" }}
              >
                <div className="w-8 h-8 bg-engineering-blue rounded-full flex items-center justify-center overflow-hidden">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt={getDisplayName()}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white text-sm font-medium">
                      {getDisplayName().charAt(0) || user?.email?.charAt(0) || 'U'}
                    </span>
                  )}
                </div>
                <motion.div
                  animate={{ opacity: isExpanded ? 1 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1"
                >
                  {isExpanded && (
                    <div>
                      <p className="font-medium text-sm">
                        {getDisplayName()}
                      </p>
                      <p className="text-xs text-gray-500">{getSubLabel()}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {userRole === 'Contractor'
                          ? getOrganizationDisplayName(userProfile?.organization, userRole)
                          : userRole === 'OrgAdmin' || userRole === 'Staff'
                          ? userOrganization?.name || '未設定'
                          : userProfile?.organization || '未設定'
                        }
                      </p>
                    </div>
                  )}
                </motion.div>
                {isExpanded && (
                  <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                )}
              </motion.div>

              {/* User Dropdown Menu */}
              {isExpanded && (
                <div className="absolute bottom-full left-0 right-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[1001]">
                  <Link href="/profile">
                    <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                      <User className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-700">プロフィール</span>
                    </div>
                  </Link>
                  {/* 設定 - OrgAdminとAdminのみ */}
                  {(userRole === 'OrgAdmin' || userRole === 'Admin') && (
                    <Link href="/settings">
                      <div className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors">
                        <Settings className="w-4 h-4 text-gray-600" />
                        <span className="text-sm text-gray-700">設定</span>
                      </div>
                    </Link>
                  )}
                  <hr className="my-2" />
                  <button
                    onClick={async () => {
                      await signOut()
                      router.push('/')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">ログアウト</span>
                  </button>
                </div>
              )}

              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[1001]">
                  <div>
                    <div>{getDisplayName()}</div>
                    <div className="text-gray-300">{userRole}</div>
                    <div className="text-gray-400">
                      {userRole === 'Contractor'
                        ? getOrganizationDisplayName(userProfile?.organization, userRole)
                        : userRole === 'OrgAdmin' || userRole === 'Staff'
                        ? userOrganization?.name || '未設定'
                        : userProfile?.organization || '未設定'
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Mobile Navigation Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-[1000]"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Mobile Navigation Overlay */}
      {isMobileOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="md:hidden fixed inset-0 bg-black/50 z-[1000]"
          onClick={() => setIsMobileOpen(false)}
        >
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="w-64 h-full bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-engineering-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">土</span>
                </div>
                <h1 className="font-bold text-lg text-engineering-blue">
                  土木プラットフォーム
                </h1>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                >
                  <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-engineering-blue/10 transition-colors">
                    <item.icon className="w-5 h-5 text-gray-600" />
                    <span className="text-gray-700 font-medium">{item.label}</span>
                    {item.badge && (typeof item.badge !== 'number' || item.badge > 0) && (
                      <Badge variant="engineering" className="ml-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  )
}