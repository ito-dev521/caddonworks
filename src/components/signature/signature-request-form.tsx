"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  FileText,
  Users,
  Calendar,
  Send,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface SignatureRequestFormProps {
  type: 'order' | 'completion' | 'monthly_invoice'
  projectId?: string
  contractId?: string
  monthlyInvoiceId?: string
  onSuccess: (result: any) => void
  onError: (error: string) => void
}

interface SignerInfo {
  email: string
  name: string
  role: 'client' | 'contractor' | 'operator'
}

export function SignatureRequestForm({
  type,
  projectId,
  contractId,
  monthlyInvoiceId,
  onSuccess,
  onError
}: SignatureRequestFormProps) {
  const [signers, setSigners] = useState<SignerInfo[]>([])
  const [message, setMessage] = useState('')
  const [daysUntilExpiration, setDaysUntilExpiration] = useState(30)
  const [templateId, setTemplateId] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const documentTypeLabels = {
    order: '発注書',
    completion: '完了届',
    monthly_invoice: '月次請求書'
  }

  const handleAddSigner = () => {
    const newSigner: SignerInfo = {
      email: '',
      name: '',
      role: type === 'monthly_invoice' ? 'contractor' : 'client'
    }
    setSigners([...signers, newSigner])
  }

  const handleUpdateSigner = (index: number, field: keyof SignerInfo, value: string) => {
    const updatedSigners = signers.map((signer, i) =>
      i === index ? { ...signer, [field]: value } : signer
    )
    setSigners(updatedSigners)
  }

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // バリデーション
      if (signers.length === 0) {
        throw new Error('署名者を少なくとも1人指定してください')
      }

      for (const signer of signers) {
        if (!signer.email || !signer.name) {
          throw new Error('全ての署名者の情報を入力してください')
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signer.email)) {
          throw new Error(`無効なメールアドレス: ${signer.email}`)
        }
      }

      // 署名リクエスト作成
      const response = await fetch('/api/box/sign/create-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          projectId,
          contractId,
          monthlyInvoiceId,
          templateId,
          signers,
          message: message || `${documentTypeLabels[type]}の署名をお願いいたします`,
          daysUntilExpiration
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || '署名リクエスト作成に失敗しました')
      }

      onSuccess(result)

    } catch (error: any) {
      onError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {documentTypeLabels[type]}の署名リクエスト作成
            </h2>
            <p className="text-gray-600 text-sm">
              電子署名による正式な書類作成を行います
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 署名者設定 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  署名者設定
                </label>
              </div>
              <button
                type="button"
                onClick={handleAddSigner}
                className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
              >
                署名者を追加
              </button>
            </div>

            <div className="space-y-3">
              {signers.map((signer, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">名前</label>
                      <input
                        type="text"
                        value={signer.name}
                        onChange={(e) => handleUpdateSigner(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="署名者名"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">メールアドレス</label>
                      <input
                        type="email"
                        value={signer.email}
                        onChange={(e) => handleUpdateSigner(index, 'email', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        placeholder="email@example.com"
                        required
                      />
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">役割</label>
                        <select
                          value={signer.role}
                          onChange={(e) => handleUpdateSigner(index, 'role', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                        >
                          <option value="client">発注者</option>
                          <option value="contractor">受注者</option>
                          <option value="operator">運営者</option>
                        </select>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSigner(index)}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm"
                      >
                        削除
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {signers.length === 0 && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">署名者を追加してください</p>
                </div>
              )}
            </div>
          </div>

          {/* メッセージ設定 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              署名依頼メッセージ（任意）
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder={`${documentTypeLabels[type]}の署名をお願いいたします。内容をご確認の上、署名をお願いします。`}
            />
          </div>

          {/* 有効期限設定 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <label className="text-sm font-medium text-gray-700">
                  署名期限
                </label>
              </div>
              <select
                value={daysUntilExpiration}
                onChange={(e) => setDaysUntilExpiration(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value={7}>7日後</option>
                <option value={14}>14日後</option>
                <option value={30}>30日後</option>
                <option value={60}>60日後</option>
              </select>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-yellow-800">注意事項</h4>
                <ul className="text-sm text-yellow-700 mt-1 space-y-1">
                  <li>• 署名リクエスト送信後の修正はできません</li>
                  <li>• 署名者には自動でメール通知が送信されます</li>
                  <li>• 期限までに全員の署名が完了する必要があります</li>
                  <li>• 署名完了後、最終的な書類がBoxに保存されます</li>
                </ul>
              </div>
            </div>
          </div>

          {/* 送信ボタン */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              type="submit"
              disabled={isSubmitting || signers.length === 0}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                isSubmitting || signers.length === 0
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {isSubmitting ? '送信中...' : '署名リクエストを送信'}
              </div>
            </button>
          </div>
        </form>
      </div>
    </motion.div>
  )
}