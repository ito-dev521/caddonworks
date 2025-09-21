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
  AlertCircle,
  CheckCircle,
  XCircle,
  ToggleLeft,
  ToggleRight,
  FileText
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
  role: 'OrgAdmin' | 'Contractor' | 'Staff'
  member_level?: MemberLevel
  formal_name?: string
  department?: string
  phone_number?: string
  created_at: string
  updated_at: string
  is_active: boolean
}

interface NewUserData {
  email: string
  display_name: string
  formal_name?: string
  department?: string
  role: 'OrgAdmin' | 'Contractor' | 'Staff'
}

interface OrganizationSettings {
  id: string
  name: string
  description?: string
  billing_email: string
  system_fee: number
  active: boolean
  approval_required: boolean
  created_at: string
}

interface CompanyInfo {
  id: string
  name: string
  postal_code: string
  address: string
  phone_number: string
  representative_name: string
  department?: string
  position?: string
  business_registration_number?: string
  business_type?: string
  website?: string
  updated_at: string
}

interface OrganizationRegistration {
  id: string
  organization_name: string
  organization_type: string
  tax_id?: string
  address: string
  phone: string
  billing_email: string
  website?: string
  description?: string
  admin_name: string
  admin_email: string
  admin_phone: string
  admin_department?: string
  system_fee: number
  status: 'pending' | 'approved' | 'rejected'
  submitted_at: string
  reviewed_at?: string
  reviewer_notes?: string
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
  const [organizationSettings, setOrganizationSettings] = useState<OrganizationSettings | null>(null)
  const [isLoadingSettings, setIsLoadingSettings] = useState(false)
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [isLoadingCompanyInfo, setIsLoadingCompanyInfo] = useState(false)
  const [isEditingCompanyInfo, setIsEditingCompanyInfo] = useState(false)
  const [editingCompanyInfo, setEditingCompanyInfo] = useState<Partial<CompanyInfo>>({})
  const [registrationInfo, setRegistrationInfo] = useState<OrganizationRegistration | null>(null)
  const [isLoadingRegistration, setIsLoadingRegistration] = useState(false)

  // 機能フラグ: 組織登録申請情報セクションの表示/取得を制御（デフォルトOFF）
  const SHOW_REGISTRATION_INFO = process.env.NEXT_PUBLIC_SHOW_ORG_REGISTRATION === 'true'

  const [newUser, setNewUser] = useState<NewUserData>({
    email: '',
    display_name: '',
    formal_name: '',
    role: 'OrgAdmin'
  })

  const [editingUser, setEditingUser] = useState<Partial<OrganizationUser>>({})
  const [editingRole, setEditingRole] = useState<'OrgAdmin' | 'Contractor' | 'Staff'>('OrgAdmin')

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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/setup-orgadmin-profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('プロフィールセットアップエラー:', errorData.message)
      }
    } catch (error) {
      console.error('プロフィールセットアップエラー:', error)
    }
  }

  // 認証ユーザーを修正
  const fixAuthUser = async (userId: string) => {
    if (!confirm('このユーザーの認証情報を修正しますか？既存の場合はリセットメールを送信します。')) {
      return
    }

    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/fix-auth-user', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      if (!response.ok) {
        const errorData = await response.json()
        // 既に認証ユーザーがある場合は、リセットメール送信にフォールバック
        if (response.status === 400 && typeof errorData.message === 'string' && errorData.message.includes('既に認証ユーザーが設定されています')) {
          const fallback = await fetch('/api/admin/users/send-reset-email', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId })
          })
          const fbData = await fallback.json()
          if (!fallback.ok) {
            throw new Error(fbData.message || 'リセットメール送信に失敗しました')
          }
          alert('既存の認証ユーザーがあるため、リセットメールを送信しました')
          return
        }
        throw new Error(errorData.message || '認証ユーザーの修正に失敗しました')
      }

      const data = await response.json()
      fetchUsers()
      alert(`認証ユーザーを作成しました。新しいパスワード: ${data.password}`)
    } catch (error) {
      console.error('認証ユーザー修正エラー:', error)
      alert(error instanceof Error ? error.message : '認証ユーザーの修正に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 組織設定を取得
  const fetchOrganizationSettings = async () => {
    try {
      setIsLoadingSettings(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/organization', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '組織設定の取得に失敗しました')
      }

      const data = await response.json()
      setOrganizationSettings(data.organization)
    } catch (error) {
      console.error('組織設定取得エラー:', error)
      alert(error instanceof Error ? error.message : '組織設定の取得に失敗しました')
    } finally {
      setIsLoadingSettings(false)
    }
  }

  // 組織設定を更新
  const updateOrganizationSettings = async (approval_required: boolean) => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ approval_required })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '組織設定の更新に失敗しました')
      }

      const data = await response.json()
      setOrganizationSettings(prev => prev ? { ...prev, approval_required } : null)
      alert('組織設定が更新されました')
    } catch (error) {
      console.error('組織設定更新エラー:', error)
      alert(error instanceof Error ? error.message : '組織設定の更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 会社情報を取得
  const fetchCompanyInfo = async () => {
    try {
      setIsLoadingCompanyInfo(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/organization/profile', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        if (response.status === 404) {
          setCompanyInfo(null)
          return
        }
        throw new Error(errorData.message || '会社情報の取得に失敗しました')
      }

      const data = await response.json()
      setCompanyInfo(data.organization)
    } catch (error) {
      console.error('会社情報取得エラー:', error)
      alert(error instanceof Error ? error.message : '会社情報の取得に失敗しました')
    } finally {
      setIsLoadingCompanyInfo(false)
    }
  }

  // 会社情報を更新
  const updateCompanyInfo = async () => {
    try {
      setIsSaving(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/organization/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ organizationData: editingCompanyInfo })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '会社情報の更新に失敗しました')
      }

      const data = await response.json()
      setCompanyInfo(data.organization)
      setIsEditingCompanyInfo(false)
      setEditingCompanyInfo({})
      alert('会社情報が更新されました')
    } catch (error) {
      console.error('会社情報更新エラー:', error)
      alert(error instanceof Error ? error.message : '会社情報の更新に失敗しました')
    } finally {
      setIsSaving(false)
    }
  }

  // 編集開始
  const startEditingCompanyInfo = () => {
    setEditingCompanyInfo(companyInfo || {})
    setIsEditingCompanyInfo(true)
  }

  // 編集キャンセル
  const cancelEditingCompanyInfo = () => {
    setEditingCompanyInfo({})
    setIsEditingCompanyInfo(false)
  }

  // 組織登録申請情報を取得
  const fetchRegistrationInfo = async () => {
    try {
      setIsLoadingRegistration(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/organization/registration', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      // 404は未登録として扱い、JSON解析は行わない（Nextの404はHTML）
      if (response.status === 404) {
        setRegistrationInfo(null)
        return
      }

      if (!response.ok) {
        // JSONでない可能性があるためtextで安全に取得
        const message = await response.text()
        throw new Error(message || '組織登録申請情報の取得に失敗しました')
      }

      const data = await response.json()
      setRegistrationInfo(data.registration)
    } catch (error) {
      console.info('組織登録申請情報取得スキップまたは未設定:', error)
      // エラーはコンソールに記録するが、UIには表示しない（404の場合は正常）
    } finally {
      setIsLoadingRegistration(false)
    }
  }

  // ユーザー一覧を取得
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      
      // まず発注者プロフィールをセットアップ
      await setupOrgAdminProfile()
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/settings/users', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'ユーザー一覧の取得に失敗しました')
      }

      const data = await response.json()
      
      // 空のユーザー一覧でも正常として扱う
      setUsers(data.users || [])
      setFilteredUsers(data.users || [])
    } catch (error) {
      console.error('ユーザー一覧取得エラー:', error)
      
      // メンバーシップ関連のエラーの場合は空のリストを設定
      if (error instanceof Error && error.message.includes('メンバーシップ')) {
        setUsers([])
        setFilteredUsers([])
      } else {
        alert('ユーザー一覧の取得に失敗しました')
      }
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
          formal_name: editingUser.formal_name,
          department: editingUser.department,
          newRole: editingRole
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
    fetchOrganizationSettings()
    fetchCompanyInfo()
    if (SHOW_REGISTRATION_INFO) {
      fetchRegistrationInfo()
    }
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

          {/* 組織登録申請情報 */}
          {SHOW_REGISTRATION_INFO && registrationInfo && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  組織登録申請情報
                </CardTitle>
                <CardDescription>
                  組織登録時に申請した情報です
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingRegistration ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{registrationInfo.organization_name}</h3>
                            <p className="text-sm text-gray-600">{registrationInfo.organization_type}</p>
                          </div>
                          <Badge
                            variant={
                              registrationInfo.status === 'approved' ? 'default' :
                              registrationInfo.status === 'pending' ? 'secondary' :
                              'destructive'
                            }
                            className={
                              registrationInfo.status === 'approved' ? 'bg-green-100 text-green-800' :
                              registrationInfo.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }
                          >
                            {registrationInfo.status === 'approved' ? '承認済み' :
                             registrationInfo.status === 'pending' ? '審査中' :
                             '却下'}
                          </Badge>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">法人番号</label>
                        <p className="text-gray-900">{registrationInfo.tax_id || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                        <p className="text-gray-900">{registrationInfo.phone}</p>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                        <p className="text-gray-900">{registrationInfo.address}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">請求先メール</label>
                        <p className="text-gray-900">{registrationInfo.billing_email}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ウェブサイト</label>
                        <p className="text-gray-900">{registrationInfo.website || '未設定'}</p>
                      </div>

                      {registrationInfo.description && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                          <p className="text-gray-900">{registrationInfo.description}</p>
                        </div>
                      )}

                      <div className="md:col-span-2 border-t border-gray-200 pt-4">
                        <h4 className="font-medium text-gray-900 mb-3">管理者情報</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">管理者名</label>
                            <p className="text-gray-900">{registrationInfo.admin_name}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">管理者メール</label>
                            <p className="text-gray-900">{registrationInfo.admin_email}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">管理者電話</label>
                            <p className="text-gray-900">{registrationInfo.admin_phone}</p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
                            <p className="text-gray-900">{registrationInfo.admin_department || '未設定'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-2 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">システム利用料</label>
                            <p className="text-gray-900 font-semibold">¥{registrationInfo.system_fee.toLocaleString()}/月</p>
                          </div>
                          <div className="text-right">
                            <label className="block text-sm font-medium text-gray-700 mb-1">申請日時</label>
                            <p className="text-sm text-gray-500">
                              {new Date(registrationInfo.submitted_at).toLocaleDateString('ja-JP', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>

                        {registrationInfo.reviewed_at && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-700 mb-1">審査完了日時</label>
                              <p className="text-sm text-gray-500">
                                {new Date(registrationInfo.reviewed_at).toLocaleDateString('ja-JP', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                            {registrationInfo.reviewer_notes && (
                              <div className="mt-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">審査メモ</label>
                                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                                  {registrationInfo.reviewer_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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

          {/* 会社情報セクション */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    会社情報
                  </CardTitle>
                  <CardDescription>
                    組織の詳細情報を管理します
                  </CardDescription>
                </div>
                {!isEditingCompanyInfo && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditingCompanyInfo}
                    className="bg-engineering-blue text-white hover:bg-engineering-blue/90"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    {companyInfo ? '編集' : '登録'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingCompanyInfo ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isEditingCompanyInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <Label htmlFor="company_name">会社名 *</Label>
                        <Input
                          id="company_name"
                          value={editingCompanyInfo.name || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, name: e.target.value })}
                          placeholder="株式会社○○"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="postal_code">郵便番号 *</Label>
                        <Input
                          id="postal_code"
                          value={editingCompanyInfo.postal_code || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, postal_code: e.target.value })}
                          placeholder="123-4567"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="phone_number">電話番号 *</Label>
                        <Input
                          id="phone_number"
                          value={editingCompanyInfo.phone_number || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, phone_number: e.target.value })}
                          placeholder="03-1234-5678"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="address">住所 *</Label>
                        <Input
                          id="address"
                          value={editingCompanyInfo.address || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, address: e.target.value })}
                          placeholder="東京都○○区○○ 1-2-3"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="representative_name">管理者名 *</Label>
                        <Input
                          id="representative_name"
                          value={editingCompanyInfo.representative_name || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, representative_name: e.target.value })}
                          placeholder="田中 太郎"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="department">部署</Label>
                        <Input
                          id="department"
                          value={editingCompanyInfo.department || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, department: e.target.value })}
                          placeholder="技術部"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="position">役職</Label>
                        <Input
                          id="position"
                          value={editingCompanyInfo.position || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, position: e.target.value })}
                          placeholder="部長"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_registration_number">法人番号</Label>
                        <Input
                          id="business_registration_number"
                          value={editingCompanyInfo.business_registration_number || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, business_registration_number: e.target.value })}
                          placeholder="1234567890123"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="business_type">事業内容</Label>
                        <Input
                          id="business_type"
                          value={editingCompanyInfo.business_type || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, business_type: e.target.value })}
                          placeholder="土木設計・建設コンサルタント"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <Label htmlFor="website">会社URL</Label>
                        <Input
                          id="website"
                          type="url"
                          value={editingCompanyInfo.website || ''}
                          onChange={(e) => setEditingCompanyInfo({ ...editingCompanyInfo, website: e.target.value })}
                          placeholder="https://example.co.jp"
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2 flex justify-end gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={cancelEditingCompanyInfo}
                          disabled={isSaving}
                        >
                          <X className="w-4 h-4 mr-2" />
                          キャンセル
                        </Button>
                        <Button
                          onClick={updateCompanyInfo}
                          disabled={isSaving || !editingCompanyInfo.name || !editingCompanyInfo.postal_code || !editingCompanyInfo.address || !editingCompanyInfo.phone_number || !editingCompanyInfo.representative_name}
                          className="bg-engineering-green hover:bg-engineering-green/90"
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {isSaving ? '保存中...' : '保存'}
                        </Button>
                      </div>
                    </div>
                  ) : companyInfo ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">会社名</label>
                        <p className="text-gray-900 font-medium">{companyInfo.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">郵便番号</label>
                        <p className="text-gray-900">{companyInfo.postal_code}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
                        <p className="text-gray-900">{companyInfo.phone_number}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
                        <p className="text-gray-900">{companyInfo.address}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">管理者名</label>
                        <p className="text-gray-900">{companyInfo.representative_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">部署</label>
                        <p className="text-gray-900">{companyInfo.department || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">役職</label>
                        <p className="text-gray-900">{companyInfo.position || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">法人番号</label>
                        <p className="text-gray-900">{companyInfo.business_registration_number || '未設定'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">事業内容</label>
                        <p className="text-gray-900">{companyInfo.business_type || '未設定'}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">会社URL</label>
                        <p className="text-gray-900">{companyInfo.website || '未設定'}</p>
                      </div>
                      <div className="md:col-span-2 pt-2 border-t border-gray-200">
                        <p className="text-sm text-gray-500">
                          最終更新: {new Date(companyInfo.updated_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        会社情報が未登録です
                      </h3>
                      <p className="text-gray-500 mb-4">
                        会社の基本情報を登録してください
                      </p>
                      <Button
                        onClick={startEditingCompanyInfo}
                        className="bg-engineering-blue hover:bg-engineering-blue/90"
                      >
                        <Building className="w-4 h-4 mr-2" />
                        会社情報を登録
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 組織設定セクション */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                組織設定
              </CardTitle>
              <CardDescription>
                組織の動作設定を管理します
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingSettings ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* 案件承認設定 */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="w-4 h-4 text-blue-600" />
                        <h3 className="font-medium text-gray-900">案件承認機能</h3>
                      </div>
                      <p className="text-sm text-gray-600">
                        新規案件登録時に管理者の承認が必要になります
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {organizationSettings?.approval_required ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          有効
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
                          <XCircle className="w-3 h-3 mr-1" />
                          無効
                        </Badge>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateOrganizationSettings(!organizationSettings?.approval_required)}
                        disabled={isSaving}
                        className="ml-2"
                      >
                        {organizationSettings?.approval_required ? (
                          <>
                            <ToggleLeft className="w-4 h-4 mr-1" />
                            無効にする
                          </>
                        ) : (
                          <>
                            <ToggleRight className="w-4 h-4 mr-1" />
                            有効にする
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
                                setEditingRole(user.role)
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {user.id !== userProfile?.id && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => deleteUser(user.id)}
                                  className="text-red-600 hover:text-red-700"
                                  disabled={isSaving}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => fixAuthUser(user.id)}
                                  className="text-blue-600 hover:text-blue-700"
                                  disabled={isSaving}
                                  title="認証ユーザーを修正"
                                >
                                  🔧
                                </Button>
                                {(!(process.env.NEXT_PUBLIC_ENV === 'production' || process.env.NODE_ENV === 'production')) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 hover:text-orange-700"
                                    disabled={isSaving}
                                    title="即時再発行(表示)"
                                    onClick={async () => {
                                      try {
                                        const ok = confirm('即時に新しいパスワードを発行して表示します。よろしいですか？')
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
                                    <Key className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
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
                <Label htmlFor="new_department">部署</Label>
                <Input
                  id="new_department"
                  value={newUser.department || ''}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  placeholder="設計部"
                  className="mt-1"
                />
              </div>


              <div>
                <Label htmlFor="role">役割 *</Label>
                <select
                  id="role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'OrgAdmin' | 'Staff' })}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                >
                  <option value="OrgAdmin">管理者</option>
                  <option value="Staff">スタッフ</option>
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

              <div>
                <Label htmlFor="edit_department">部署</Label>
                <Input
                  id="edit_department"
                  value={editingUser.department || ''}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="edit_role">役割</Label>
                <select
                  id="edit_role"
                  value={editingRole}
                  onChange={(e) => setEditingRole(e.target.value as any)}
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                >
                  <option value="OrgAdmin">管理者</option>
                  <option value="Staff">スタッフ</option>
                </select>
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

