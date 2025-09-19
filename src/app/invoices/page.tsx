"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  FileText,
  Download,
  Send,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
  MessageCircle,
  User,
  Calendar,
  DollarSign
} from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface Invoice {
  id: string
  invoice_number: string
  status: string
  issue_date: string
  due_date: string
  base_amount: number
  system_fee: number
  total_amount: number
  project: {
    id: string
    title: string
    contractor_id: string
  }
  contract: {
    id: string
    bid_amount: number
  }
  client_org: {
    id: string
    name: string
  }
}

interface ContactForm {
  subject: string
  message: string
}

export default function InvoicesPage() {
  return (
    <AuthGuard>
      <InvoicesPageContent />
    </AuthGuard>
  )
}

function InvoicesPageContent() {
  const { userProfile, userRole } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState<ContactForm>({
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 請求書一覧を取得
  const fetchInvoices = async () => {
    if (!userProfile) return

    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/invoices`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setInvoices(result.invoices || [])
      }
    } catch (error) {
      console.error('請求書取得エラー:', error)
    } finally {
      setLoading(false)
    }
  }

  // 請求書発行
  const issueInvoice = async (invoiceId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/invoices/${invoiceId}/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('請求書を発行しました。')
        await fetchInvoices()
        setSelectedInvoice(null)
      } else {
        alert('請求書発行に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('請求書発行エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  // 問い合わせ送信
  const submitContact = async () => {
    if (!contactForm.subject.trim() || !contactForm.message.trim()) {
      alert('件名とメッセージを入力してください')
      return
    }

    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subject: contactForm.subject,
          message: contactForm.message,
          related_invoice_id: selectedInvoice?.id,
          type: 'invoice_inquiry'
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('問い合わせを送信しました。')
        setShowContactForm(false)
        setContactForm({ subject: '', message: '' })
      } else {
        alert('問い合わせ送信に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('問い合わせ送信エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    if (userProfile && userRole === 'Contractor') {
      fetchInvoices()
    }
  }, [userProfile, userRole])

  // 受注者以外はアクセス不可
  if (userRole !== 'Contractor') {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="md:ml-64 transition-all duration-300">
          <main className="px-6 py-8">
            <div className="max-w-4xl mx-auto">
              <Card>
                <CardContent className="p-8 text-center">
                  <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    アクセス権限がありません
                  </h2>
                  <p className="text-gray-600">
                    このページは受注者のみアクセス可能です。
                  </p>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-gray-600">下書き</Badge>
      case 'issued':
        return <Badge variant="default" className="bg-green-600">発行済み</Badge>
      case 'paid':
        return <Badge variant="default" className="bg-blue-600">支払済み</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-5 h-5 text-gray-600" />
      case 'issued':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'paid':
        return <CheckCircle className="w-5 h-5 text-blue-600" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-600" />
    }
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        <main className="px-6 py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            
            {/* ヘッダー */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">請求書管理</h1>
                  <p className="text-gray-600 mt-2">
                    発注者から作成された請求書を確認し、発行してください
                  </p>
                </div>
              </div>
            </motion.div>

            {/* 請求書一覧 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    請求書一覧
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-engineering-blue mx-auto"></div>
                      <p className="text-gray-600 mt-2">読み込み中...</p>
                    </div>
                  ) : invoices.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600">請求書はありません</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {invoices.map((invoice) => (
                        <div
                          key={invoice.id}
                          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              {getStatusIcon(invoice.status)}
                              <div>
                                <h3 className="font-semibold text-gray-900">
                                  {invoice.invoice_number}
                                </h3>
                                <p className="text-sm text-gray-600">
                                  {invoice.project.title}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {invoice.client_org.name}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="font-semibold text-gray-900">
                                  ¥{invoice.total_amount.toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {new Date(invoice.issue_date).toLocaleDateString('ja-JP')}
                                </p>
                              </div>
                              {getStatusBadge(invoice.status)}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedInvoice(invoice)}
                              >
                                詳細
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* 請求書詳細モーダル */}
            {selectedInvoice && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={() => setSelectedInvoice(null)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-bold text-gray-900">
                        請求書詳細
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedInvoice(null)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="space-y-6">
                      {/* 基本情報 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            請求書番号
                          </label>
                          <p className="text-gray-900">{selectedInvoice.invoice_number}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            ステータス
                          </label>
                          {getStatusBadge(selectedInvoice.status)}
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            発行日
                          </label>
                          <p className="text-gray-900">
                            {new Date(selectedInvoice.issue_date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            支払期限
                          </label>
                          <p className="text-gray-900">
                            {new Date(selectedInvoice.due_date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>

                      {/* 案件情報 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          案件名
                        </label>
                        <p className="text-gray-900">{selectedInvoice.project.title}</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          発注者
                        </label>
                        <p className="text-gray-900">{selectedInvoice.client_org.name}</p>
                      </div>

                      {/* 金額詳細 */}
                      <div className="border-t pt-4">
                        <h3 className="font-semibold text-gray-900 mb-3">金額詳細</h3>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">契約金額</span>
                            <span className="text-gray-900">¥{selectedInvoice.base_amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">システム手数料</span>
                            <span className="text-gray-900">¥{selectedInvoice.system_fee.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between border-t pt-2 font-semibold">
                            <span className="text-gray-900">合計金額</span>
                            <span className="text-gray-900">¥{selectedInvoice.total_amount.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex gap-4 pt-4 border-t">
                        {selectedInvoice.status === 'draft' && (
                          <Button
                            onClick={() => issueInvoice(selectedInvoice.id)}
                            className="bg-engineering-blue hover:bg-engineering-blue/90"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            請求書を発行
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() => setShowContactForm(true)}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          問い合わせ
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {/* 問い合わせフォームモーダル */}
            {showContactForm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
                onClick={() => setShowContactForm(false)}
              >
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-white rounded-lg shadow-xl max-w-md w-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">
                        問い合わせ
                      </h3>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowContactForm(false)}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          件名 *
                        </label>
                        <input
                          type="text"
                          value={contactForm.subject}
                          onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="件名を入力してください"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          メッセージ *
                        </label>
                        <textarea
                          value={contactForm.message}
                          onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          placeholder="問い合わせ内容を入力してください"
                        />
                      </div>
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={submitContact}
                          disabled={isSubmitting}
                          className="bg-engineering-blue hover:bg-engineering-blue/90"
                        >
                          {isSubmitting ? '送信中...' : '送信'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowContactForm(false)}
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
