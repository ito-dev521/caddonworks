"use client"

import React, { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Users,
  Search,
  Edit,
  Save,
  X,
  Shield,
  User,
  Mail,
  Calendar,
  MapPin,
  Phone,
  Building,
  Trash2,
  Plus
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"

type OperatorRole = 'Admin' | 'Reviewer' | 'Auditor'

interface AdminUser {
  id: string
  email: string
  display_name: string
  specialties: string[]
  qualifications: string[]
  experience_years?: string
  member_level?: MemberLevel
  formal_name?: string
  phone_number?: string
  address?: string
  created_at: string
  updated_at: string
  role?: OperatorRole
}

export default function AdminUsersPage() {
  return (
    <AuthGuard requiredRole="Admin">
      <AdminUsersPageContent />
    </AuthGuard>
  )
}

function AdminUsersPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [filteredUsers, setFilteredUsers] = useState<AdminUser[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingLevel, setEditingLevel] = useState<MemberLevel>('beginner')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [newDisplayName, setNewDisplayName] = useState("")
  const [newRole, setNewRole] = useState<OperatorRole>('Auditor')

  // 運営者権限チェック
  if (userRole !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
            <p className="text-gray-600">このページにアクセスするには管理者権限が必要です。</p>
          </div>
        </div>
      </div>
    )
  }

  // ユーザー一覧を取得（運営者のみ: Admin/Reviewer/Auditor）
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('ユーザー一覧の取得に失敗しました')
      }

      const data = await response.json()
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('ユーザー一覧取得エラー:', error)
      alert('ユーザー一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 役割や氏名の更新（PUT）
  const updateOperator = async (userId: string, payload: { displayName?: string; role?: OperatorRole }) => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('セッションが見つかりません')

      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId, ...payload })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || '更新に失敗しました')

      // 反映
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, display_name: payload.displayName ?? u.display_name, role: payload.role ?? u.role } : u))
      setFilteredUsers(prev => prev.map(u => u.id === userId ? { ...u, display_name: payload.displayName ?? u.display_name, role: payload.role ?? u.role } : u))
    } catch (e: any) {
      console.error('運営更新エラー:', e)
      alert(e.message || '更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 運営ユーザー作成（POST）
  const createOperator = async () => {
    try {
      if (!newEmail) return alert('メールアドレスを入力してください')
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('セッションが見つかりません')
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: newEmail, displayName: newDisplayName || undefined, role: newRole })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || '作成に失敗しました')
      // 反映
      await fetchUsers()
      setNewEmail("")
      setNewDisplayName("")
      setNewRole('Auditor')
      alert('ユーザーを作成しました。初回設定用のメールが送信されます。')
    } catch (e: any) {
      console.error('運営作成エラー:', e)
      alert(e.message || '作成に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 運営ユーザー削除（DELETE）
  const deleteOperator = async (userId: string) => {
    try {
      const ok = confirm('この運営ユーザーを削除します。よろしいですか？')
      if (!ok) return
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('セッションが見つかりません')
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.message || '削除に失敗しました')
      setUsers(prev => prev.filter(u => u.id !== userId))
      setFilteredUsers(prev => prev.filter(u => u.id !== userId))
      alert('削除しました')
    } catch (e: any) {
      console.error('運営削除エラー:', e)
      alert(e.message || '削除に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 旧：会員レベル更新は当面維持（必要なら運営に非表示化可）
  // 会員レベルを更新
  const updateMemberLevel = async (userId: string, newLevel: MemberLevel) => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          memberLevel: newLevel
        })
      })

      if (!response.ok) {
        throw new Error('会員レベルの更新に失敗しました')
      }

      // ローカル状態を更新
      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, member_level: newLevel } : user
      ))
      setFilteredUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, member_level: newLevel } : user
      ))
      
      setEditingUserId(null)
      alert('会員レベルが正常に更新されました')
    } catch (error) {
      console.error('会員レベル更新エラー:', error)
      alert('会員レベルの更新に失敗しました')
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
              <Shield className="w-8 h-8 text-engineering-blue" />
              運営ユーザー管理
            </h1>
            <p className="text-gray-600">
              運営会社のスタッフ（Admin / Reviewer / Auditor）を追加・編集・削除できます
            </p>
          </div>

          {/* 追加フォーム */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">運営ユーザーの追加</CardTitle>
              <CardDescription>メール送信で初期設定してもらいます</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-4 gap-3">
              <input
                type="email"
                placeholder="メールアドレス"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded"
              />
              <input
                type="text"
                placeholder="表示名（任意）"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded"
              />
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as OperatorRole)}
                className="w-full px-3 py-2 border border-gray-200 rounded"
              >
                <option value="Admin">Admin（管理者）</option>
                <option value="Reviewer">Reviewer（審査）</option>
                <option value="Auditor">Auditor（監査）</option>
              </select>
              <Button onClick={createOperator} disabled={isSaving} className="bg-engineering-blue">
                <Plus className="w-4 h-4 mr-1" /> 追加
              </Button>
            </CardContent>
          </Card>

          {/* 検索バー */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="ユーザー名、メールアドレス、氏名で検索..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                />
              </div>
            </CardContent>
          </Card>

          {/* ユーザー一覧 */}
          <div className="grid gap-6">
            {filteredUsers.map((user) => (
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
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                          {user.formal_name && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-4 h-4" />
                              {user.formal_name}
                            </div>
                          )}
                          {user.phone_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              {user.phone_number}
                            </div>
                          )}
                          {user.address && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <MapPin className="w-4 h-4" />
                              {user.address}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="w-4 h-4" />
                            登録日: {new Date(user.created_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {user.specialties?.map((specialty, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">会員レベル:</span>
                          {editingUserId === user.id ? (
                            <div className="flex items-center gap-2">
                              <select
                                value={editingLevel}
                                onChange={(e) => setEditingLevel(e.target.value as MemberLevel)}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                {Object.values(MEMBER_LEVELS).map(level => (
                                  <option key={level.level} value={level.level}>
                                    {level.label}
                                  </option>
                                ))}
                              </select>
                              <Button
                                size="sm"
                                onClick={() => updateMemberLevel(user.id, editingLevel)}
                                disabled={isSaving}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Save className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingUserId(null)}
                                disabled={isSaving}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge className={MEMBER_LEVELS[user.member_level || 'beginner'].color}>
                                {MEMBER_LEVELS[user.member_level || 'beginner'].label}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingUserId(user.id)
                                  setEditingLevel(user.member_level || 'beginner')
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {/* 運営ロールの編集 */}
                              <select
                                value={user.role || 'Reviewer'}
                                onChange={(e) => updateOperator(user.id, { role: e.target.value as OperatorRole })}
                                className="px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="Reviewer">Reviewer</option>
                                <option value="Auditor">Auditor</option>
                                <option value="Admin">Admin</option>
                              </select>
                              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => deleteOperator(user.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-300 hover:bg-red-50"
                                onClick={async () => {
                                  try {
                                    const ok = confirm(`選択ユーザーのパスワードをリセットします。よろしいですか？`)
                                    if (!ok) return
                                    const { data: { session } } = await supabase.auth.getSession()
                                    if (!session) throw new Error('セッションが見つかりません')
                                    const res = await fetch('/api/admin/users/send-reset-email', {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${session.access_token}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({ userId: user.id })
                                    })
                                    const data = await res.json()
                                    if (!res.ok) throw new Error(data.message || 'メール送信に失敗しました')
                                    alert('リセットメールを送信しました')
                                  } catch (e: any) {
                                    console.error('パスワードリセット失敗:', e)
                                    alert(e.message || 'パスワードリセットに失敗しました')
                                  }
                                }}
                              >
                                リセットメール送信
                              </Button>
                              {(!(process.env.NEXT_PUBLIC_ENV === 'production' || process.env.NODE_ENV === 'production')) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-orange-600 border-orange-300 hover:bg-orange-50"
                                  onClick={async () => {
                                    try {
                                      const ok = confirm('即時に新しいパスワードを発行して表示します（メールは送信しません）。よろしいですか？')
                                      if (!ok) return
                                      const { data: { session } } = await supabase.auth.getSession()
                                      if (!session) throw new Error('セッションが見つかりません')
                                      const res = await fetch('/api/admin/users/reset-password', {
                                        method: 'POST',
                                        headers: {
                                          'Authorization': `Bearer ${session.access_token}`,
                                          'Content-Type': 'application/json'
                                        },
                                        body: JSON.stringify({ userId: user.id })
                                      })
                                      const data = await res.json()
                                      if (!res.ok) throw new Error(data.message || '再発行に失敗しました')
                                      alert(`新しいパスワード: ${data.newPassword}`)
                                    } catch (e: any) {
                                      console.error('即時再発行失敗:', e)
                                      alert(e.message || '再発行に失敗しました')
                                    }
                                  }}
                                >
                                  即時再発行(表示)
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">ユーザーが見つかりません</h3>
                <p className="text-gray-600">{searchTerm ? '検索条件に一致するユーザーがありません' : 'ユーザーが登録されていません'}</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
