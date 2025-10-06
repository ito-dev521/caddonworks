"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Calendar,
  User,
  Building,
  DollarSign,
  Send,
  CheckCircle,
  Clock,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"

interface Project {
  id: string
  title: string
  location: string
  category: string
  start_date: string
  end_date: string
  budget: number
}

interface Contract {
  id: string
  bid_amount: number
  start_date: string
  end_date: string
  signed_at: string
}

interface Organization {
  id: string
  name: string
}

interface CompletionReportData {
  id?: string
  project_id: string
  contract_id: string
  actual_completion_date: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected'
  report_number?: string
  submission_date?: string
  contractor_signed_at?: string
  org_signed_at?: string
  approved_at?: string
  box_sign_request_id?: string
  signed_document_id?: string
}

interface SimpleCompletionReportFormProps {
  project: Project
  contract: Contract
  organization: Organization
  onSubmit: (data: CompletionReportData) => void
  existingReport?: CompletionReportData
  readOnly?: boolean
}

export function SimpleCompletionReportForm({
  project,
  contract,
  organization,
  onSubmit,
  existingReport,
  readOnly = false
}: SimpleCompletionReportFormProps) {
  const { userProfile } = useAuth()
  const [formData, setFormData] = useState<CompletionReportData>({
    project_id: project.id,
    contract_id: contract.id,
    actual_completion_date: new Date().toISOString().split('T')[0],
    status: 'draft',
    ...existingReport
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // バリデーション
  const validate = (): boolean => {
    if (!formData.actual_completion_date) {
      setError('実際の完了日は必須です')
      return false
    }

    const completionDate = new Date(formData.actual_completion_date)
    const contractStartDate = new Date(contract.start_date)
    const contractEndDate = new Date(contract.end_date)

    if (completionDate < contractStartDate) {
      setError('完了日は契約開始日以降である必要があります')
      return false
    }

    setError(null)
    return true
  }

  // 提出処理
  const handleSubmit = async () => {
    if (!validate()) return

    setLoading(true)
    try {
      await onSubmit({
        ...formData,
        status: 'submitted'
      })
    } catch (err: any) {
      setError(err.message || 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }


  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-800', icon: <FileText className="w-3 h-3" /> },
      submitted: { label: '提出済み', className: 'bg-blue-100 text-blue-800', icon: <Clock className="w-3 h-3" /> },
      approved: { label: '承認済み', className: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      rejected: { label: '差し戻し', className: 'bg-red-100 text-red-800', icon: <X className="w-3 h-3" /> }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft

    return (
      <Badge className={`${config.className} flex items-center gap-1`}>
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY'
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <FileText className="w-6 h-6 text-engineering-blue" />
                業務完了届
              </CardTitle>
              {formData.report_number && (
                <p className="text-sm text-gray-600 mt-1">
                  届出番号: {formData.report_number}
                </p>
              )}
            </div>
            {getStatusBadge(formData.status)}
          </div>
        </CardHeader>
      </Card>

      {/* エラー表示 */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-50 border border-red-200 rounded-lg p-4"
        >
          <div className="flex items-center gap-2 text-red-700">
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        </motion.div>
      )}

      {/* 基本情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">業務名</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="font-medium text-gray-900">{project.title}</div>
                <div className="text-sm text-gray-600 mt-1">
                  {project.category} | {project.location}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">業務期間</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="font-medium text-gray-900">
                  {formatDate(contract.start_date)} ～ {formatDate(contract.end_date)}
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  契約日: {formatDate(contract.signed_at)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">実際の完了日 *</label>
              <input
                type="date"
                value={formData.actual_completion_date}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  actual_completion_date: e.target.value
                }))}
                disabled={readOnly || formData.status !== 'draft'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent disabled:bg-gray-50"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">業務番号/ID</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="font-mono text-gray-900">
                  {project.id.substring(0, 8).toUpperCase()}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 関係者情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">👥 関係者情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">発注者情報</label>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Building className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-blue-900">{organization.name}</span>
                </div>
                <div className="text-sm text-blue-700">
                  担当者: 発注担当者
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">受注者情報</label>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-green-900">
                    {userProfile?.formal_name || userProfile?.display_name || '受注者'}
                  </span>
                </div>
                <div className="text-sm text-green-700">
                  {userProfile?.display_name !== userProfile?.formal_name &&
                   userProfile?.display_name && `(${userProfile.display_name})`}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">契約金額</label>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-yellow-600" />
                  <span className="font-bold text-yellow-900 text-lg">
                    {formatCurrency(contract.bid_amount)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">契約日</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">
                    {formatDate(contract.signed_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 署名・確認状況 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">📋 完了確認</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">受注者署名</label>
              <div className={`p-4 rounded-lg border ${
                formData.contractor_signed_at
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {formData.contractor_signed_at ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">署名済み</div>
                      <div className="text-sm text-green-700">
                        {formatDate(formData.contractor_signed_at)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">署名待ち</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">発注者確認</label>
              <div className={`p-4 rounded-lg border ${
                formData.org_signed_at
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                {formData.org_signed_at ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div>
                      <div className="font-medium text-green-900">確認済み</div>
                      <div className="text-sm text-green-700">
                        受理日: {formatDate(formData.org_signed_at)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-600">確認待ち</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">完了届提出日</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="font-medium text-gray-900">
                  {formData.submission_date
                    ? formatDate(formData.submission_date)
                    : '未提出'
                  }
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">承認日</label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="font-medium text-gray-900">
                  {formData.approved_at
                    ? formatDate(formData.approved_at)
                    : '未承認'
                  }
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* アクションボタン */}
      {!readOnly && formData.status === 'draft' && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={handleSubmit}
                disabled={loading}
                size="lg"
                className="bg-engineering-blue hover:bg-engineering-blue-dark"
              >
                <Send className="w-4 h-4 mr-2" />
                {loading ? '提出中...' : '完了届を提出'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}