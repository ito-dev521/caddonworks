"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSignature,
  Search,
  Filter,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  Download,
  Eye,
  Plus,
  RefreshCw
} from 'lucide-react'
import { SignatureStatus } from './signature-status'
import { SignatureRequestForm } from './signature-request-form'

interface SignatureRequest {
  id: string
  boxSignRequestId: string
  documentType: 'order' | 'completion' | 'monthly_invoice'
  status: string
  project?: { title: string }
  monthlyInvoice?: { billing_year: number; billing_month: number }
  signers: Array<{
    email: string
    hasSigned: boolean
    hasDeclined: boolean
  }>
  createdAt: string
  sentAt?: string
  completedAt?: string
  expiresAt?: string
}

interface SignatureManagementProps {
  projectId?: string
  contractId?: string
  monthlyInvoiceId?: string
  showCreateButton?: boolean
}

const documentTypeLabels = {
  order: '発注書',
  completion: '完了届',
  monthly_invoice: '月次請求書'
}

const statusLabels = {
  converting: '変換中',
  created: '作成済み',
  sent: '送信済み',
  viewed: '閲覧済み',
  downloaded: 'ダウンロード済み',
  signed: '署名完了',
  declined: '署名拒否',
  cancelled: 'キャンセル',
  expired: '期限切れ',
  finalizing: '最終処理中',
  error: 'エラー'
}

const statusColors = {
  converting: 'text-blue-600 bg-blue-50 border-blue-200',
  created: 'text-gray-600 bg-gray-50 border-gray-200',
  sent: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  viewed: 'text-orange-600 bg-orange-50 border-orange-200',
  downloaded: 'text-purple-600 bg-purple-50 border-purple-200',
  signed: 'text-green-600 bg-green-50 border-green-200',
  declined: 'text-red-600 bg-red-50 border-red-200',
  cancelled: 'text-gray-600 bg-gray-50 border-gray-200',
  expired: 'text-red-600 bg-red-50 border-red-200',
  finalizing: 'text-blue-600 bg-blue-50 border-blue-200',
  error: 'text-red-600 bg-red-50 border-red-200'
}

export function SignatureManagement({
  projectId,
  contractId,
  monthlyInvoiceId,
  showCreateButton = true
}: SignatureManagementProps) {
  const [requests, setRequests] = useState<SignatureRequest[]>([])
  const [filteredRequests, setFilteredRequests] = useState<SignatureRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const fetchRequests = async () => {
    try {
      setError(null)
      const params = new URLSearchParams()
      if (projectId) params.set('projectId', projectId)
      if (contractId) params.set('contractId', contractId)
      if (monthlyInvoiceId) params.set('monthlyInvoiceId', monthlyInvoiceId)

      const response = await fetch(`/api/box/sign/requests?${params}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '署名リクエスト取得に失敗しました')
      }

      const data = await response.json()
      setRequests(data.requests || [])
    } catch (err: any) {
      setError(err.message)
      console.error('署名リクエスト取得エラー:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [projectId, contractId, monthlyInvoiceId])

  // フィルタリング
  useEffect(() => {
    let filtered = requests

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(req =>
        req.project?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.signers.some(s => s.email.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // ステータスフィルタ
    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter)
    }

    // ドキュメントタイプフィルタ
    if (typeFilter !== 'all') {
      filtered = filtered.filter(req => req.documentType === typeFilter)
    }

    setFilteredRequests(filtered)
  }, [requests, searchTerm, statusFilter, typeFilter])

  const handleCreateSuccess = (result: any) => {
    console.log('署名リクエスト作成成功:', result)
    setShowCreateForm(false)
    fetchRequests() // リストを更新
  }

  const handleCreateError = (error: string) => {
    console.error('署名リクエスト作成エラー:', error)
  }

  const handleDownloadSigned = async (documentId: string) => {
    try {
      const response = await fetch(`/api/box/files/${documentId}/download`)

      if (!response.ok) {
        throw new Error('ダウンロードに失敗しました')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `signed-document-${documentId}.pdf`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch (error: any) {
      console.error('ダウンロードエラー:', error)
      alert(`ダウンロードに失敗しました: ${error.message}`)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'signed':
        return <CheckCircle className="w-4 h-4" />
      case 'declined':
      case 'cancelled':
      case 'expired':
      case 'error':
        return <XCircle className="w-4 h-4" />
      case 'sent':
      case 'viewed':
      case 'downloaded':
        return <Clock className="w-4 h-4" />
      default:
        return <AlertTriangle className="w-4 h-4" />
    }
  }

  const getSignatureProgress = (signers: any[]) => {
    const signed = signers.filter(s => s.hasSigned).length
    const declined = signers.filter(s => s.hasDeclined).length
    return { signed, total: signers.length, declined }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">署名リクエスト読み込み中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileSignature className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">署名管理</h2>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchRequests}
              className="p-2 bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
              title="更新"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {showCreateButton && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                新規署名リクエスト
              </button>
            )}
          </div>
        </div>

        {/* フィルター */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="プロジェクトまたはメールで検索..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全てのステータス</option>
            <option value="sent">送信済み</option>
            <option value="viewed">閲覧済み</option>
            <option value="signed">署名完了</option>
            <option value="declined">署名拒否</option>
            <option value="expired">期限切れ</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="all">全ての書類</option>
            <option value="order">発注書</option>
            <option value="completion">完了届</option>
            <option value="monthly_invoice">月次請求書</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            {filteredRequests.length} 件 / {requests.length} 件
          </div>
        </div>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">エラー</span>
          </div>
          <p className="text-red-700 text-sm mt-1">{error}</p>
        </div>
      )}

      {/* 署名リクエスト一覧 */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filteredRequests.map((request) => {
            const progress = getSignatureProgress(request.signers)
            const isExpired = request.expiresAt && new Date(request.expiresAt) < new Date()

            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-lg shadow-lg overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg border ${statusColors[request.status]}`}>
                        {getStatusIcon(request.status)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {documentTypeLabels[request.documentType]}
                        </h3>
                        <div className="text-sm text-gray-600">
                          {request.project && `プロジェクト: ${request.project.title}`}
                          {request.monthlyInvoice &&
                            `請求期間: ${request.monthlyInvoice.billing_year}年${request.monthlyInvoice.billing_month}月`
                          }
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[request.status]}`}>
                        {statusLabels[request.status]}
                      </span>

                      <div className="text-right text-sm text-gray-600">
                        <div>作成: {new Date(request.createdAt).toLocaleDateString('ja-JP')}</div>
                        {isExpired && (
                          <div className="text-red-600 font-medium">期限切れ</div>
                        )}
                      </div>

                      <button
                        onClick={() => setSelectedRequest(
                          selectedRequest === request.id ? null : request.id
                        )}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 署名進捗 */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        署名進捗: {progress.signed} / {progress.total} 完了
                      </span>
                      {progress.declined > 0 && (
                        <span className="text-sm text-red-600">
                          ({progress.declined} 件拒否)
                        </span>
                      )}
                    </div>

                    {request.status === 'signed' && (
                      <button
                        onClick={() => handleDownloadSigned(request.boxSignRequestId)}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 text-sm flex items-center gap-2"
                      >
                        <Download className="w-3 h-3" />
                        ダウンロード
                      </button>
                    )}
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(progress.signed / progress.total) * 100}%` }}
                    />
                  </div>
                </div>

                {/* 詳細表示 */}
                <AnimatePresence>
                  {selectedRequest === request.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-gray-200"
                    >
                      <div className="p-6 bg-gray-50">
                        <SignatureStatus
                          requestId={request.id}
                          onDownload={handleDownloadSigned}
                          onRefresh={fetchRequests}
                          showActions={false}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </AnimatePresence>

        {filteredRequests.length === 0 && !loading && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <FileSignature className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              署名リクエストがありません
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' || typeFilter !== 'all'
                ? '検索条件に一致する署名リクエストが見つかりません'
                : 'まだ署名リクエストが作成されていません'
              }
            </p>
            {showCreateButton && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                新規作成
              </button>
            )}
          </div>
        )}
      </div>

      {/* 新規作成モーダル */}
      <AnimatePresence>
        {showCreateForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowCreateForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">
                    新規署名リクエスト作成
                  </h3>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <SignatureRequestForm
                  type={monthlyInvoiceId ? 'monthly_invoice' : 'order'}
                  projectId={projectId}
                  contractId={contractId}
                  monthlyInvoiceId={monthlyInvoiceId}
                  onSuccess={handleCreateSuccess}
                  onError={handleCreateError}
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}