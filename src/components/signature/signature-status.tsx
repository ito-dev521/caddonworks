"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileSignature,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  RefreshCw,
  User,
  Calendar,
  AlertTriangle,
  Eye,
  Send
} from 'lucide-react'

interface SignatureStatusProps {
  requestId: string
  onDownload?: (documentId: string) => void
  onRefresh?: () => void
  showActions?: boolean
}

interface SignatureStatusData {
  id: string
  boxSignRequestId: string
  documentType: 'order' | 'completion' | 'monthly_invoice'
  status: 'converting' | 'created' | 'sent' | 'viewed' | 'downloaded' | 'signed' | 'declined' | 'cancelled' | 'expired' | 'finalizing' | 'error'
  template?: { name: string; type: string }
  project?: { title: string }
  monthlyInvoice?: { billing_year: number; billing_month: number }
  signers: Array<{
    email: string
    hasViewed: boolean
    hasDeclined: boolean
    declinedReason?: string
    hasSigned: boolean
    signedAt?: string
    role: string
  }>
  sourceDocumentId?: string
  signedDocumentId?: string
  createdAt: string
  sentAt?: string
  completedAt?: string
  expiresAt?: string
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
  converting: 'text-blue-600 bg-blue-50',
  created: 'text-gray-600 bg-gray-50',
  sent: 'text-yellow-600 bg-yellow-50',
  viewed: 'text-orange-600 bg-orange-50',
  downloaded: 'text-purple-600 bg-purple-50',
  signed: 'text-green-600 bg-green-50',
  declined: 'text-red-600 bg-red-50',
  cancelled: 'text-gray-600 bg-gray-50',
  expired: 'text-red-600 bg-red-50',
  finalizing: 'text-blue-600 bg-blue-50',
  error: 'text-red-600 bg-red-50'
}

const roleLabels = {
  client: '発注者',
  contractor: '受注者',
  operator: '運営者',
  signer: '署名者'
}

export function SignatureStatus({
  requestId,
  onDownload,
  onRefresh,
  showActions = true
}: SignatureStatusProps) {
  const [data, setData] = useState<SignatureStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchStatus = async () => {
    try {
      setError(null)
      const response = await fetch(`/api/box/sign/status/${requestId}`)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '署名ステータス取得に失敗しました')
      }

      const statusData = await response.json()
      setData(statusData)
    } catch (err: any) {
      setError(err.message)
      console.error('署名ステータス取得エラー:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchStatus()
  }, [requestId])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchStatus()
    onRefresh?.()
  }

  const handleDownload = async () => {
    if (!data?.signedDocumentId || !onDownload) return
    onDownload(data.signedDocumentId)
  }

  const getSignerStatusIcon = (signer: any) => {
    if (signer.hasSigned) return <CheckCircle className="w-4 h-4 text-green-600" />
    if (signer.hasDeclined) return <XCircle className="w-4 h-4 text-red-600" />
    if (signer.hasViewed) return <Eye className="w-4 h-4 text-orange-600" />
    return <Clock className="w-4 h-4 text-gray-400" />
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">署名ステータス読み込み中...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            署名ステータス取得エラー
          </h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            再試行
          </button>
        </div>
      </div>
    )
  }

  if (!data) return null

  const isCompleted = data.status === 'signed'
  const canDownload = isCompleted && data.signedDocumentId

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-lg"
    >
      {/* ヘッダー */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSignature className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {documentTypeLabels[data.documentType]}
              </h2>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                {data.project && (
                  <span>プロジェクト: {data.project.title}</span>
                )}
                {data.monthlyInvoice && (
                  <span>
                    請求期間: {data.monthlyInvoice.billing_year}年{data.monthlyInvoice.billing_month}月
                  </span>
                )}
              </div>
            </div>
          </div>

          {showActions && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`p-2 rounded-md transition-colors ${
                  refreshing
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                title="ステータス更新"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {canDownload && (
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  署名済み文書をダウンロード
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-medium text-gray-700">現在のステータス</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[data.status]}`}>
              {statusLabels[data.status]}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>作成: {new Date(data.createdAt).toLocaleDateString('ja-JP')}</span>
            </div>
            {data.sentAt && (
              <div className="flex items-center gap-1">
                <Send className="w-4 h-4" />
                <span>送信: {new Date(data.sentAt).toLocaleDateString('ja-JP')}</span>
              </div>
            )}
            {data.completedAt && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4" />
                <span>完了: {new Date(data.completedAt).toLocaleDateString('ja-JP')}</span>
              </div>
            )}
            {data.expiresAt && (
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>期限: {new Date(data.expiresAt).toLocaleDateString('ja-JP')}</span>
              </div>
            )}
          </div>
        </div>

        {/* 署名者リスト */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">署名者一覧</h3>
          <div className="space-y-3">
            {data.signers.map((signer, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getSignerStatusIcon(signer)}
                    <User className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{signer.email}</div>
                    <div className="text-sm text-gray-600">
                      {roleLabels[signer.role as keyof typeof roleLabels] || signer.role}
                    </div>
                  </div>
                </div>

                <div className="text-right text-sm">
                  {signer.hasSigned && signer.signedAt ? (
                    <div className="text-green-600">
                      署名完了
                      <div className="text-xs text-gray-500">
                        {new Date(signer.signedAt).toLocaleString('ja-JP')}
                      </div>
                    </div>
                  ) : signer.hasDeclined ? (
                    <div className="text-red-600">
                      署名拒否
                      {signer.declinedReason && (
                        <div className="text-xs text-gray-500">
                          理由: {signer.declinedReason}
                        </div>
                      )}
                    </div>
                  ) : signer.hasViewed ? (
                    <span className="text-orange-600">閲覧済み</span>
                  ) : (
                    <span className="text-gray-500">未確認</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">署名進捗</span>
            <span className="text-sm text-gray-600">
              {data.signers.filter(s => s.hasSigned).length} / {data.signers.length} 完了
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${(data.signers.filter(s => s.hasSigned).length / data.signers.length) * 100}%`
              }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="bg-green-500 h-2 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* 完了メッセージ */}
      <AnimatePresence>
        {isCompleted && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-gray-200 p-6 bg-green-50"
          >
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h4 className="font-medium text-green-800">署名完了</h4>
                <p className="text-sm text-green-700">
                  全ての署名者による署名が完了しました。署名済み文書をダウンロードできます。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}