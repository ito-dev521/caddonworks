"use client"

import React, { useEffect, useState } from "react"
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
  Building
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"

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
}

export default function AdminUsersPage() {
  return (
    <AuthGuard>
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

  // 運営者権限チェック
  if (userRole !== 'Admin') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">アクセス拒否</h1>
            <p className="text-gray-600">このページにアクセスするには運営者権限が必要です。</p>
          </div>
        </div>
      </div>
    )
  }

  // ユーザー一覧を取得
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
              ユーザー管理
            </h1>
            <p className="text-gray-600">
              全ユーザーの会員レベルを管理できます
            </p>
          </div>

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
                <p className="text-gray-600">
                  {searchTerm ? '検索条件に一致するユーザーがありません' : 'ユーザーが登録されていません'}
                </p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
