"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Settings,
  Users,
  UserPlus,
  Edit,
  Trash2,
  Save,
  X,
  Mail,
  Building,
  Shield,
  Key,
  Search,
  AlertCircle
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"
import { supabase } from "@/lib/supabase"

interface OrganizationUser {
  id: string
  email: string
  display_name: string
  role: 'OrgAdmin' | 'Contractor'
  member_level?: MemberLevel
  formal_name?: string
  phone_number?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

interface NewUserData {
  email: string
  display_name: string
  formal_name?: string
  role: 'OrgAdmin' | 'Contractor'
}

export default function SettingsPage() {
  return (
    <AuthGuard requiredRole="OrgAdmin">
      <SettingsPageContent />
    </AuthGuard>
  )
}

function SettingsPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const [users, setUsers] = useState<OrganizationUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<OrganizationUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showNewUserModal, setShowNewUserModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [organizationDomain, setOrganizationDomain] = useState('')

  const [newUser, setNewUser] = useState<NewUserData>({
    email: '',
    display_name: '',
    formal_name: '',
    role: 'Contractor'
  })

  const [editingUser, setEditingUser] = useState<Partial<OrganizationUser>>({})

  // 組織のドメインを取得
  useEffect(() => {
    if (userProfile?.email) {
      const domain = userProfile.email.split('@')[1]
      setOrganizationDomain(domain)
    }
  }, [userProfile])

  // 発注者プロフィールをセットアップ
  const setupOrgAdminProfile = async () => {
    try {
      console.log('プロフィールセットアップ開始')
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('セッション取得結果:', { session: !!session })
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      console.log('プロフィールセットアップAPI呼び出し')
      const response = await fetch('/api/setup-orgadmin-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('プロフィールセットアップAPI応答:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorData = await response.json()
        console.log('プロフィールセットアップエラー:', errorData.message)
      } else {
        const successData = await response.json()
        console.log('プロフィールセットアップ成功:', successData.message)
      }
    } catch (error) {
      console.error('プロフィールセットアップエラー:', error)
    }
  }

  // デバッグ: メンバーシップ情報を確認
  const debugMemberships = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        alert('セッションが見つかりません')
        return
      }

      console.log('デバッグ: メンバーシップ情報を取得中...')
      const response = await fetch('/api/debug-memberships', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      console.log('デバッグ結果:', data)
      alert('デバッグ結果をコンソールに出力しました')
    } catch (error) {
      console.error('デバッグエラー:', error)
      alert('デバッグに失敗しました')
    }
  }

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      console.log('ユーザー一覧取得開始')
      
      // まず発注者プロフィールをセットアップ
      await setupOrgAdminProfile()
      
      const { data: { session } } = await supabase.auth.getSession()
      
      console.log('ユーザー一覧取得用セッション:', { session: !!session })
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      console.log('ユーザー一覧API呼び出し')
      const response = await fetch('/api/settings/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('ユーザー一覧API応答:', { status: response.status, ok: response.ok })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('ユーザー一覧取得エラー詳細:', errorData)
        throw new Error(errorData.message || 'ユーザー一覧の取得に失敗しました')
      }

      const data = await response.json()
      console.log('ユーザー一覧データ:', data)
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('ユーザー一覧取得エラー:', error)
      alert('ユーザー一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 新規ユーザー登録
  const createUser = async () => {
    try {
      setIsSaving(true)
      
      // ドメインチェック
      const emailDomain = newUser.email.split('@')[1]
      if (emailDomain !== organizationDomain) {
        alert(`メールアドレスは ${organizationDomain} ドメインである必要があります`)
        return
      }

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newUser)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'ユーザー登録に失敗しました')
      }

      const data = await response.json()
      alert(`ユーザーが登録されました。パスワード: ${data.password}`)
      
      setShowNewUserModal(false)
      setNewUser({
        email: '',
        display_name: '',
        formal_name: '',
        role: 'Contractor'
      })
      fetchUsers()
    } catch (error) {
      console.error('ユーザー登録エラー:', error)
      alert(error instanceof Error ? error.message : 'ユーザー登録に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // ユーザー更新
  const updateUser = async () => {
    if (!editingUserId) return

    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: editingUserId,
          display_name: editingUser.display_name,
          formal_name: editingUser.formal_name
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'ユーザー更新に失敗しました')
      }

      setEditingUserId(null)
      setEditingUser({})
      fetchUsers()
      alert('ユーザー情報が更新されました')
    } catch (error) {
      console.error('ユーザー更新エラー:', error)
      alert(error instanceof Error ? error.message : 'ユーザー更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // ユーザー削除
  const deleteUser = async (userId: string) => {
    if (!confirm('このユーザーを削除しますか？この操作は取り消せません。')) {
      return
    }

    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/users', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'ユーザー削除に失敗しました')
      }

      fetchUsers()
      alert('ユーザーが削除されました')
    } catch (error) {
      console.error('ユーザー削除エラー:', error)
      alert(error instanceof Error ? error.message : 'ユーザー削除に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 検索フィルタリング
  useEffect(() => {
    if (!searchTerm) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user =>
        user.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.formal_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [searchTerm, users])

  useEffect(() => {
    fetchUsers()
  }, [])

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto"></div>
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Settings className="w-8 h-8 text-engineering-blue" />
              設定
            </h1>
            <p className="text-gray-600">
              組織のユーザー管理を行います
            </p>
          </div>

          {/* ドメイン情報 */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                組織情報
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">許可ドメイン:</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">
                  @{organizationDomain}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                新規ユーザーはこのドメインのメールアドレスでのみ登録できます
              </p>
            </CardContent>
          </Card>

          {/* ユーザー管理セクション */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    ユーザー管理
                  </CardTitle>
                  <CardDescription>
                    組織のユーザーを管理します
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => setShowNewUserModal(true)}
                    className="bg-engineering-blue hover:bg-engineering-blue/90"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    新規ユーザー
                  </Button>
                  <Button
                    onClick={debugMemberships}
                    variant="outline"
                    size="sm"
                  >
                    デバッグ
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* 検索バー */}
              <div className="relative mb-6">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ユーザー名、メールアドレス、氏名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                />
              </div>

              {/* ユーザー一覧 */}
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      ユーザーが登録されていません
                    </h3>
                    <p className="text-gray-500 mb-4">
                      新規ユーザーを追加して組織を始めましょう
                    </p>
                    <Button
                      onClick={() => setShowNewUserModal(true)}
                      className="bg-engineering-blue hover:bg-engineering-blue/90"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      最初のユーザーを追加
                    </Button>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-12 h-12 bg-engineering-blue rounded-full flex items-center justify-center text-white font-bold text-lg">
                                {user.display_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {user.display_name}
                                </h3>
                                <p className="text-sm text-gray-600">{user.email}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge className={user.role === 'OrgAdmin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>
                                    {user.role === 'OrgAdmin' ? '管理者' : '一般ユーザー'}
                                  </Badge>
                                </div>
                              </div>
                            </div>

                            {user.formal_name && (
                              <p className="text-sm text-gray-600 mb-2">
                                <span className="font-medium">氏名:</span> {user.formal_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                            </p>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingUserId(user.id)
                                setEditingUser({
                                  display_name: user.display_name,
                                  formal_name: user.formal_name
                                })
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.id !== userProfile?.id && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteUser(user.id)}
                                className="text-red-600 hover:text-red-700"
                                disabled={isSaving}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 新規ユーザーモーダル */}
      {showNewUserModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowNewUserModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">新規ユーザー登録</h2>
              <p className="text-gray-600">組織に新しいユーザーを追加します</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="email">メールアドレス *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder={`user@${organizationDomain}`}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  @{organizationDomain} ドメインのメールアドレスを入力してください
                </p>
              </div>

              <div>
                <Label htmlFor="display_name">表示名 *</Label>
                <Input
                  id="display_name"
                  value={newUser.display_name}
                  onChange={(e) => setNewUser({ ...newUser, display_name: e.target.value })}
                  placeholder="田中太郎"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="formal_name">氏名</Label>
                <Input
                  id="formal_name"
                  value={newUser.formal_name}
                  onChange={(e) => setNewUser({ ...newUser, formal_name: e.target.value })}
                  placeholder="田中 太郎"
                  className="mt-1"
                />
              </div>


              <div>
                <Label htmlFor="role">役割 *</Label>
                <select
                  id="role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'OrgAdmin' | 'Contractor' })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                >
                  <option value="Contractor">一般ユーザー</option>
                  <option value="OrgAdmin">管理者</option>
                </select>
              </div>

            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowNewUserModal(false)}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button
                onClick={createUser}
                disabled={isSaving || !newUser.email || !newUser.display_name}
                className="bg-engineering-blue hover:bg-engineering-blue/90"
              >
                {isSaving ? '登録中...' : '登録'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* 編集モーダル */}
      {editingUserId && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingUserId(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">ユーザー編集</h2>
              <p className="text-gray-600">ユーザー情報を編集します</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <Label htmlFor="edit_display_name">表示名 *</Label>
                <Input
                  id="edit_display_name"
                  value={editingUser.display_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit_formal_name">氏名</Label>
                <Input
                  id="edit_formal_name"
                  value={editingUser.formal_name || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, formal_name: e.target.value })}
                  className="mt-1"
                />
              </div>

            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setEditingUserId(null)}
                disabled={isSaving}
              >
                キャンセル
              </Button>
              <Button
                onClick={updateUser}
                disabled={isSaving || !editingUser.display_name}
                className="bg-engineering-blue hover:bg-engineering-blue/90"
              >
                {isSaving ? '更新中...' : '更新'}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}
