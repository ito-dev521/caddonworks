"use client"

import { useState, useEffect } from 'react'
import { Navigation } from "@/components/layouts/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { motion } from "framer-motion"
import {
  FolderLock,
  Users,
  Settings,
  Download,
  Eye,
  Upload,
  Shield,
  Clock,
  AlertTriangle,
  Check,
  X,
  ChevronDown,
  Search
} from "lucide-react"

interface User {
  id: string
  name: string
  email: string
  role: 'contractor' | 'orgadmin'
  organization?: string
}

interface Permission {
  folderId: string
  folderName: string
  download: boolean
  preview: boolean
  upload: boolean
  edit: boolean
}

interface UserPermissions {
  userId: string
  user: User
  permissions: Permission[]
  timeRestrictions: {
    enabled: boolean
    startTime: string
    endTime: string
    timezone: string
  }
  downloadLimits: {
    enabled: boolean
    maxPerDay: number
    maxSizePerDay: string
  }
}

export default function BoxPermissionsPage() {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [emergencyMode, setEmergencyMode] = useState(false)

  // ユーザー一覧を取得
  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/box-permissions/users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('ユーザー取得エラー:', error)
    }
  }

  // 選択されたユーザーの権限を取得
  const fetchUserPermissions = async (userId: string) => {
    if (!userId) return

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/box-permissions/users/${userId}`)
      const data = await response.json()
      setUserPermissions(data.userPermissions)
    } catch (error) {
      console.error('権限取得エラー:', error)
    }
    setIsLoading(false)
  }

  // 権限設定を更新
  const updatePermission = async (folderId: string, permissionType: string, value: boolean) => {
    if (!userPermissions) return

    try {
      const response = await fetch('/api/admin/box-permissions/update', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userPermissions.userId,
          folderId,
          permissionType,
          value
        })
      })

      if (response.ok) {
        // UIを即座に更新
        setUserPermissions(prev => {
          if (!prev) return prev
          return {
            ...prev,
            permissions: prev.permissions.map(p =>
              p.folderId === folderId
                ? { ...p, [permissionType]: value }
                : p
            )
          }
        })
      }
    } catch (error) {
      console.error('権限更新エラー:', error)
    }
  }

  // 緊急時全停止
  const emergencyStopAll = async () => {
    if (!confirm('全受注者のBox アクセスを停止しますか？')) return

    try {
      await fetch('/api/admin/box-permissions/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stop_all' })
      })
      setEmergencyMode(true)
      alert('全受注者のアクセスを停止しました')
    } catch (error) {
      console.error('緊急停止エラー:', error)
    }
  }

  // フィルタリングされたユーザー
  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
            {/* ヘッダー */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <FolderLock className="w-8 h-8 text-engineering-blue" />
                Box権限管理
              </h1>
              <p className="text-gray-600 mt-2">
                受注者のフォルダ別アクセス権限・ダウンロード制限を管理します
              </p>
            </div>

            {/* 緊急操作パネル */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="font-semibold text-red-800">緊急操作</span>
                </div>
                <button
                  onClick={emergencyStopAll}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
                >
                  全アクセス停止
                </button>
              </div>
              {emergencyMode && (
                <p className="text-red-700 text-sm mt-2">
                  ⚠️ 緊急モード：全受注者のBoxアクセスが停止中です
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* ユーザー選択パネル */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    ユーザー選択
                  </h2>

                  {/* 検索バー */}
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="ユーザーを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                    />
                  </div>

                  {/* ユーザーリスト */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredUsers.map(user => (
                      <div
                        key={user.id}
                        onClick={() => {
                          setSelectedUserId(user.id)
                          fetchUserPermissions(user.id)
                        }}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedUserId === user.id
                            ? 'bg-engineering-blue text-white'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                      >
                        <div className="font-medium">{user.name}</div>
                        <div className={`text-sm ${
                          selectedUserId === user.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {user.email}
                        </div>
                        <div className={`text-xs ${
                          selectedUserId === user.id ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {user.role === 'contractor' ? '受注者' : '発注者'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 権限設定パネル */}
              <div className="lg:col-span-2">
                {isLoading ? (
                  <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-96">
                    <div className="text-gray-500">読み込み中...</div>
                  </div>
                ) : userPermissions ? (
                  <div className="space-y-6">
                    {/* 基本情報 */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        {userPermissions.user.name} の権限設定
                      </h2>
                      <p className="text-gray-600 text-sm">
                        {userPermissions.user.email} • {userPermissions.user.role === 'contractor' ? '受注者' : '発注者'}
                      </p>
                    </div>

                    {/* フォルダ別権限設定 */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <FolderLock className="w-5 h-5" />
                        フォルダ別権限
                      </h3>

                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-3 px-4">フォルダ</th>
                              <th className="text-center py-3 px-4">プレビュー</th>
                              <th className="text-center py-3 px-4">ダウンロード</th>
                              <th className="text-center py-3 px-4">アップロード</th>
                              <th className="text-center py-3 px-4">編集</th>
                            </tr>
                          </thead>
                          <tbody>
                            {userPermissions.permissions.map(permission => (
                              <tr key={permission.folderId} className="border-b">
                                <td className="py-3 px-4 font-medium">
                                  {permission.folderName}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <PermissionToggle
                                    enabled={permission.preview}
                                    onChange={(value) => updatePermission(permission.folderId, 'preview', value)}
                                    icon={<Eye className="w-4 h-4" />}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <PermissionToggle
                                    enabled={permission.download}
                                    onChange={(value) => updatePermission(permission.folderId, 'download', value)}
                                    icon={<Download className="w-4 h-4" />}
                                    variant={permission.download ? 'danger' : 'default'}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <PermissionToggle
                                    enabled={permission.upload}
                                    onChange={(value) => updatePermission(permission.folderId, 'upload', value)}
                                    icon={<Upload className="w-4 h-4" />}
                                  />
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <PermissionToggle
                                    enabled={permission.edit}
                                    onChange={(value) => updatePermission(permission.folderId, 'edit', value)}
                                    icon={<Settings className="w-4 h-4" />}
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* 時間制限設定 */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Clock className="w-5 h-5" />
                        時間制限
                      </h3>
                      <div className="space-y-4">
                        <label className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={userPermissions.timeRestrictions.enabled}
                            onChange={(e) => {
                              // 時間制限の有効/無効切り替え処理
                            }}
                            className="w-4 h-4 text-engineering-blue"
                          />
                          <span>アクセス時間を制限する</span>
                        </label>

                        {userPermissions.timeRestrictions.enabled && (
                          <div className="grid grid-cols-2 gap-4 ml-7">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                開始時刻
                              </label>
                              <input
                                type="time"
                                value={userPermissions.timeRestrictions.startTime}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                終了時刻
                              </label>
                              <input
                                type="time"
                                value={userPermissions.timeRestrictions.endTime}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg shadow p-6 flex items-center justify-center h-96">
                    <div className="text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>ユーザーを選択してください</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AuthGuard>
  )
}

// 権限トグルコンポーネント
function PermissionToggle({
  enabled,
  onChange,
  icon,
  variant = 'default'
}: {
  enabled: boolean
  onChange: (value: boolean) => void
  icon: React.ReactNode
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        enabled
          ? variant === 'danger'
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-green-100 text-green-700 hover:bg-green-200'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
    >
      {icon}
      {enabled ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
    </button>
  )
}