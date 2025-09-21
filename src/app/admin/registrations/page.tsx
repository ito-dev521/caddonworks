"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import {
  Building,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  User,
  Eye,
  Search,
  Filter,
  Calendar,
  DollarSign,
  AlertCircle,
  MessageSquare
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { supabase } from "@/lib/supabase"

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
  reviewer_id?: string
}

export default function AdminRegistrationsPage() {
  return (
    <AuthGuard requiredRole="Admin">
      <AdminRegistrationsPageContent />
    </AuthGuard>
  )
}

function AdminRegistrationsPageContent() {
  const { userProfile } = useAuth()
  const [registrations, setRegistrations] = useState<OrganizationRegistration[]>([])
  const [filteredRegistrations, setFilteredRegistrations] = useState<OrganizationRegistration[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')
  const [selectedRegistration, setSelectedRegistration] = useState<OrganizationRegistration | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [reviewNotes, setReviewNotes] = useState('')

  // 登録申請一覧を取得
  const fetchRegistrations = async () => {
    try {
      setIsLoading(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/admin/organization-registrations', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '登録申請一覧の取得に失敗しました')
      }

      const data = await response.json()
      setRegistrations(data.registrations || [])
      setFilteredRegistrations(data.registrations || [])
    } catch (error) {
      console.error('登録申請一覧取得エラー:', error)
      alert(error instanceof Error ? error.message : '登録申請一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 申請を承認・却下
  const processRegistration = async (registrationId: string, action: 'approve' | 'reject') => {
    try {
      setIsProcessing(true)
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        throw new Error('セッションが見つかりません')
      }

      const response = await fetch('/api/admin/organization-registrations', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          registration_id: registrationId,
          action,
          reviewer_notes: reviewNotes
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || '処理に失敗しました')
      }

      const data = await response.json()
      alert(data.message)

      setSelectedRegistration(null)
      setReviewNotes('')
      fetchRegistrations()
    } catch (error) {
      console.error('登録申請処理エラー:', error)
      alert(error instanceof Error ? error.message : '処理に失敗しました')
    } finally {
      setIsProcessing(false)
    }
  }

  // 検索とフィルタリング
  useEffect(() => {
    let filtered = registrations

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(reg => reg.status === statusFilter)
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(reg =>
        reg.organization_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.admin_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.admin_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        reg.billing_email.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredRegistrations(filtered)
  }, [searchTerm, statusFilter, registrations])

  useEffect(() => {
    fetchRegistrations()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />承認済み</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />却下</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />審査中</Badge>
    }
  }

  if (isLoading) {
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
              <Building className="w-8 h-8 text-engineering-blue" />
              組織登録申請管理
            </h1>
            <p className="text-gray-600">
              組織登録申請の承認・却下を管理します
            </p>
          </div>

          {/* 検索・フィルタセクション */}
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="組織名、管理者名、メールアドレスで検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent appearance-none"
                  >
                    <option value="all">すべてのステータス</option>
                    <option value="pending">審査中</option>
                    <option value="approved">承認済み</option>
                    <option value="rejected">却下</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 統計情報 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">総申請数</p>
                    <p className="text-2xl font-bold text-gray-900">{registrations.length}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">審査中</p>
                    <p className="text-2xl font-bold text-yellow-600">
                      {registrations.filter(r => r.status === 'pending').length}
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">承認済み</p>
                    <p className="text-2xl font-bold text-green-600">
                      {registrations.filter(r => r.status === 'approved').length}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">却下</p>
                    <p className="text-2xl font-bold text-red-600">
                      {registrations.filter(r => r.status === 'rejected').length}
                    </p>
                  </div>
                  <XCircle className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 登録申請一覧 */}
          <Card>
            <CardHeader>
              <CardTitle>登録申請一覧</CardTitle>
              <CardDescription>
                {filteredRegistrations.length}件の申請が見つかりました
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredRegistrations.length === 0 ? (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    申請が見つかりません
                  </h3>
                  <p className="text-gray-500">
                    検索条件を変更するか、新しい申請をお待ちください
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRegistrations.map((registration) => (
                    <motion.div
                      key={registration.id}
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
                                  {registration.organization_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {registration.organization_name}
                                  </h3>
                                  <p className="text-sm text-gray-600">{registration.organization_type}</p>
                                  <div className="flex items-center gap-2 mt-1">
                                    {getStatusBadge(registration.status)}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <User className="w-4 h-4" />
                                  <span>{registration.admin_name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Mail className="w-4 h-4" />
                                  <span>{registration.admin_email}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <Phone className="w-4 h-4" />
                                  <span>{registration.phone}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <DollarSign className="w-4 h-4" />
                                  <span>¥{registration.system_fee.toLocaleString()}/月</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Calendar className="w-4 h-4" />
                                <span>申請日: {new Date(registration.submitted_at).toLocaleDateString('ja-JP')}</span>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSelectedRegistration(registration)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                詳細
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 詳細モーダル */}
      {selectedRegistration && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedRegistration(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {selectedRegistration.organization_name}
                  </h2>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedRegistration.status)}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedRegistration(null)}
                >
                  ×
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* 組織情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  組織情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">組織名</Label>
                    <p className="text-gray-900">{selectedRegistration.organization_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">組織タイプ</Label>
                    <p className="text-gray-900">{selectedRegistration.organization_type}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">法人番号</Label>
                    <p className="text-gray-900">{selectedRegistration.tax_id || '未設定'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">電話番号</Label>
                    <p className="text-gray-900">{selectedRegistration.phone}</p>
                  </div>
                  <div className="md:col-span-2">
                    <Label className="text-sm font-medium text-gray-700">住所</Label>
                    <p className="text-gray-900">{selectedRegistration.address}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">請求先メール</Label>
                    <p className="text-gray-900">{selectedRegistration.billing_email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">ウェブサイト</Label>
                    <p className="text-gray-900">{selectedRegistration.website || '未設定'}</p>
                  </div>
                  {selectedRegistration.description && (
                    <div className="md:col-span-2">
                      <Label className="text-sm font-medium text-gray-700">事業内容</Label>
                      <p className="text-gray-900">{selectedRegistration.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 管理者情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  管理者情報
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                  <div>
                    <Label className="text-sm font-medium text-gray-700">管理者名</Label>
                    <p className="text-gray-900">{selectedRegistration.admin_name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">メールアドレス</Label>
                    <p className="text-gray-900">{selectedRegistration.admin_email}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">電話番号</Label>
                    <p className="text-gray-900">{selectedRegistration.admin_phone}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-700">部署</Label>
                    <p className="text-gray-900">{selectedRegistration.admin_department || '未設定'}</p>
                  </div>
                </div>
              </div>

              {/* 契約情報 */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  契約情報
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">システム利用料</Label>
                      <p className="text-gray-900 font-semibold text-lg">¥{selectedRegistration.system_fee.toLocaleString()}/月</p>
                    </div>
                    <div className="text-right">
                      <Label className="text-sm font-medium text-gray-700">申請日時</Label>
                      <p className="text-gray-900">
                        {new Date(selectedRegistration.submitted_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 審査情報 */}
              {selectedRegistration.reviewed_at && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    審査情報
                  </h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="mb-3">
                      <Label className="text-sm font-medium text-gray-700">審査完了日時</Label>
                      <p className="text-gray-900">
                        {new Date(selectedRegistration.reviewed_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    {selectedRegistration.reviewer_notes && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">審査メモ</Label>
                        <p className="text-gray-900 bg-white p-3 rounded border">
                          {selectedRegistration.reviewer_notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 審査アクション */}
              {selectedRegistration.status === 'pending' && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    審査
                  </h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="mb-4">
                      <Label htmlFor="review_notes">審査メモ</Label>
                      <textarea
                        id="review_notes"
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="審査結果について記載してください..."
                        className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        rows={4}
                      />
                    </div>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => processRegistration(selectedRegistration.id, 'approve')}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {isProcessing ? '処理中...' : '承認'}
                      </Button>
                      <Button
                        onClick={() => processRegistration(selectedRegistration.id, 'reject')}
                        disabled={isProcessing}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        {isProcessing ? '処理中...' : '却下'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  )
}