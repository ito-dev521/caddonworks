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
  DollarSign,
  BarChart3,
  TrendingUp,
  TrendingDown
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
  fee_amount: number
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

interface CompletionReport {
  id: string
  project_id: string
  contract_id: string
  actual_completion_date: string
  status: string
  submission_date: string
  projects: {
    id: string
    title: string
    org_id: string
    organizations: {
      id: string
      name: string
    }
  }
  contracts: {
    id: string
    bid_amount: number
    contractor_id: string
    support_enabled?: boolean
  }
}

interface OrgGroup {
  org_id: string
  org_name: string
  reports: CompletionReport[]
  total_contract_amount: number
  total_support_fee: number
  total_withholding: number
  total_final_amount: number
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
  const [completionReports, setCompletionReports] = useState<CompletionReport[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showContactForm, setShowContactForm] = useState(false)
  const [contactForm, setContactForm] = useState<ContactForm>({
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // 源泉徴収税を計算
  // 支払金額が100万円以下: 支払金額 × 10.21%
  // 支払金額が100万円超: (支払金額 - 100万円) × 20.42% + 102,100円
  const calculateWithholding = (amount: number) => {
    if (amount <= 1000000) {
      return Math.floor(amount * 0.1021)
    } else {
      return Math.floor((amount - 1000000) * 0.2042 + 102100)
    }
  }

  // 最終請求額を計算
  const calculateFinalAmount = (invoice: Invoice) => {
    const withholding = calculateWithholding(invoice.total_amount)
    return invoice.total_amount - withholding
  }

  // 業務完了届を取得
  const fetchCompletionReports = async () => {
    if (!userProfile) return

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/completion-reports`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setCompletionReports(result || [])
      }
    } catch (error) {
      console.error('業務完了届取得エラー:', error)
    }
  }

  // 選択月の請求書（作成済み）を組織別にグループ化
  const getOrgGroups = (): OrgGroup[] => {
    const [year, month] = selectedMonth.split('-').map(Number)

    // 選択月に発行された請求書をフィルタリング
    const filteredInvoices = invoices.filter(invoice => {
      if (!invoice.issue_date) return false
      const issueDate = new Date(invoice.issue_date)
      return issueDate.getFullYear() === year && issueDate.getMonth() + 1 === month
    })

    const groups: Record<string, OrgGroup> = {}

    filteredInvoices.forEach(invoice => {
      const orgId = invoice.client_org.id
      const orgName = invoice.client_org.name

      if (!groups[orgId]) {
        groups[orgId] = {
          org_id: orgId,
          org_name: orgName,
          reports: [], // 請求書ベースなので空配列
          total_contract_amount: 0,
          total_support_fee: 0,
          total_withholding: 0,
          total_final_amount: 0
        }
      }

      // テーブル表示と同じ計算ロジックを使用
      const contractAmount = invoice.contract.bid_amount
      const supportFee = invoice.fee_amount // fee_amountを直接使用
      const withholding = calculateWithholding(invoice.total_amount) // 小計から源泉徴収税を計算
      const finalAmount = invoice.total_amount - withholding // 小計 - 源泉税 = 請求額

      groups[orgId].total_contract_amount += contractAmount
      groups[orgId].total_support_fee += supportFee
      groups[orgId].total_withholding += withholding
      groups[orgId].total_final_amount += finalAmount
    })

    return Object.values(groups)
  }

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

  // 請求書作成（月単位で全組織まとめて作成）
  const handleCreateContractorInvoice = async () => {
    const orgGroups = getOrgGroups()
    if (orgGroups.length === 0) {
      alert('対象月の業務完了届がありません')
      return
    }

    const totalAmount = orgGroups.reduce((sum, group) => sum + group.total_final_amount, 0)
    const orgNames = orgGroups.map(g => g.org_name).join('、')

    if (!confirm(`${selectedMonth}の請求書を作成しますか？\n\n対象組織: ${orgNames}\n合計請求額: ¥${totalAmount.toLocaleString()}\n\n※各組織ごとに請求書が作成されます。`)) {
      return
    }

    try {
      setIsSubmitting(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('セッションが切れています。再ログインしてください。')
        return
      }

      let successCount = 0
      let errorMessages: string[] = []

      // 各組織ごとに請求書を作成
      for (const orgGroup of orgGroups) {
        const response = await fetch('/api/contractor-invoices', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            org_id: orgGroup.org_id,
            month: selectedMonth,
            completion_report_ids: orgGroup.reports.map(r => r.id)
          })
        })

        const result = await response.json()

        if (response.ok) {
          successCount++
        } else {
          console.error('請求書作成エラー:', result)
          const errorDetail = result.error ? `\n詳細: ${result.error}` : ''
          const errorContext = result.detail ? `\n詳細情報: ${result.detail}` : ''
          errorMessages.push(`${orgGroup.org_name}: ${result.message}${errorDetail}${errorContext}`)
        }
      }

      if (errorMessages.length > 0) {
        alert(`請求書作成結果:\n成功: ${successCount}件\n失敗: ${errorMessages.length}件\n\n失敗詳細:\n${errorMessages.join('\n')}`)
      } else {
        alert(`請求書を${successCount}件作成しました。管理者の請求書管理ページで確認できます。`)
      }

      await fetchInvoices()
    } catch (error) {
      console.error('請求書作成エラー:', error)
      alert('ネットワークエラーが発生しました: ' + (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // 請求書作成ボタンの表示判定（選択月の20日を過ぎているかチェック）
  const canCreateInvoice = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const today = new Date()
    const targetDate = new Date(year, month - 1, 21) // 21日になったら作成可能
    return today >= targetDate
  }

  useEffect(() => {
    if (userProfile && userRole === 'Contractor') {
      fetchInvoices()
      fetchCompletionReports()
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
                  <h1 className="text-3xl font-bold text-gray-900">請求書・報酬管理</h1>
                  <p className="text-gray-600 mt-2">
                    業務完了届に基づく請求書を確認できます。契約金額からサポート利用料と源泉徴収税が控除された金額が請求額となります。
                  </p>
                </div>
                <Button
                  onClick={() => setShowSummary(!showSummary)}
                  variant={showSummary ? "default" : "outline"}
                  className={showSummary ? "bg-engineering-blue" : ""}
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  {showSummary ? '集計を非表示' : '集計を表示'}
                </Button>
              </div>
            </motion.div>

            {/* 組織別集計表示 */}
            {showSummary && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.1 }}
                className="space-y-4"
              >
                {/* 月選択 */}
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <label className="text-sm font-medium text-gray-700">対象月:</label>
                      <input
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* 組織別集計 */}
                {getOrgGroups().map((group) => (
                  <Card key={group.org_id} className="bg-gradient-to-br from-gray-50 to-white">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{group.org_name}</CardTitle>
                        <Badge className="bg-engineering-blue text-white">
                          請求額 ¥{group.total_final_amount.toLocaleString()}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {/* 請求書一覧テーブル */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="px-4 py-2 text-left">プロジェクト</th>
                              <th className="px-4 py-2 text-left">発行日</th>
                              <th className="px-4 py-2 text-right">契約金額</th>
                              <th className="px-4 py-2 text-right">サポート利用金額</th>
                              <th className="px-4 py-2 text-right">源泉税</th>
                              <th className="px-4 py-2 text-right">請求額</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const [year, month] = selectedMonth.split('-').map(Number)
                              const orgInvoices = invoices.filter(invoice => {
                                if (!invoice.issue_date) return false
                                const issueDate = new Date(invoice.issue_date)
                                return invoice.client_org.id === group.org_id &&
                                       issueDate.getFullYear() === year &&
                                       issueDate.getMonth() + 1 === month
                              })

                              return orgInvoices.map((invoice) => {
                                const contractAmount = invoice.contract.bid_amount
                                const supportFee = invoice.fee_amount // fee_amountを直接使用
                                const withholding = calculateWithholding(invoice.total_amount) // 小計から源泉徴収税を計算
                                const finalAmount = invoice.total_amount - withholding // 小計 - 源泉税 = 請求額
                                return (
                                  <tr key={invoice.id} className="border-t">
                                    <td className="px-4 py-2">{invoice.project.title}</td>
                                    <td className="px-4 py-2">{new Date(invoice.issue_date).toLocaleDateString('ja-JP')}</td>
                                    <td className="px-4 py-2 text-right">¥{contractAmount.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-red-600">¥{supportFee.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right text-orange-600">¥{withholding.toLocaleString()}</td>
                                    <td className="px-4 py-2 text-right font-semibold">¥{finalAmount.toLocaleString()}</td>
                                  </tr>
                                )
                              })
                            })()}
                          </tbody>
                          <tfoot className="bg-gray-50 font-bold">
                            <tr>
                              <td className="px-4 py-2" colSpan={2}>合計 ({(() => {
                                const [year, month] = selectedMonth.split('-').map(Number)
                                return invoices.filter(invoice => {
                                  if (!invoice.issue_date) return false
                                  const issueDate = new Date(invoice.issue_date)
                                  return invoice.client_org.id === group.org_id &&
                                         issueDate.getFullYear() === year &&
                                         issueDate.getMonth() + 1 === month
                                }).length
                              })()}件)</td>
                              <td className="px-4 py-2 text-right">¥{group.total_contract_amount.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right text-red-600">¥{group.total_support_fee.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right text-orange-600">¥{group.total_withholding.toLocaleString()}</td>
                              <td className="px-4 py-2 text-right text-engineering-blue">¥{group.total_final_amount.toLocaleString()}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {getOrgGroups().length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-gray-500">
                      {selectedMonth}の請求書はありません
                    </CardContent>
                  </Card>
                ) : (
                  /* 月単位の集計情報 */
                  <Card className="bg-gradient-to-br from-blue-50 to-white border-2 border-engineering-blue">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-1">
                            {selectedMonth}の請求書集計
                          </h3>
                          <p className="text-sm text-gray-600">
                            全{getOrgGroups().length}社 合計 {(() => {
                              const [year, month] = selectedMonth.split('-').map(Number)
                              return invoices.filter(invoice => {
                                if (!invoice.issue_date) return false
                                const issueDate = new Date(invoice.issue_date)
                                return issueDate.getFullYear() === year && issueDate.getMonth() + 1 === month
                              }).length
                            })()}件の請求書
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-engineering-blue">
                            ¥{getOrgGroups().reduce((sum, g) => sum + g.total_final_amount, 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-600">合計請求額</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </motion.div>
            )}

            {/* 計算方法の説明 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: showSummary ? 0.2 : 0.1 }}
            >
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-blue-600 mt-1" />
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-900 mb-2">💡 請求額の計算方法</h3>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>① 契約金額（税込）- サポート利用料 = 小計</p>
                        <p>② 小計 - 源泉徴収税 = <strong>請求額（お振込金額）</strong></p>
                        <p className="text-xs text-blue-600 mt-2">
                          ※源泉徴収税：小計が100万円以下の場合「小計 × 10.21%」、100万円超の場合「(小計 - 100万円) × 20.42% + 102,100円」
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 請求書一覧 */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
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
                                <p className="font-semibold text-engineering-blue text-lg">
                                  ¥{calculateFinalAmount(invoice).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-500">
                                  請求額（源泉税控除後）
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
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
                            <span className="text-gray-600">契約金額（税込）</span>
                            <span className="text-gray-900">¥{selectedInvoice.contract.bid_amount.toLocaleString()}</span>
                          </div>
                          {(() => {
                            const supportFee = selectedInvoice.fee_amount // fee_amountを直接使用
                            if (supportFee > 0) {
                              return (
                                <div className="flex justify-between text-red-600">
                                  <span>サポート利用料</span>
                                  <span>-¥{supportFee.toLocaleString()}</span>
                                </div>
                              )
                            }
                            return null
                          })()}
                          <div className="flex justify-between border-t pt-2">
                            <span className="text-gray-900">小計</span>
                            <span className="text-gray-900">¥{selectedInvoice.total_amount.toLocaleString()}</span>
                          </div>
                          {(() => {
                            const total = selectedInvoice.total_amount
                            const withholding = calculateWithholding(total)
                            const finalAmount = total - withholding
                            return (
                              <>
                                <div className="flex justify-between text-orange-600">
                                  <span>源泉徴収税（{total <= 1000000 ? '10.21%' : '20.42%'}）</span>
                                  <span>-¥{withholding.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between border-t pt-2 font-bold text-lg">
                                  <span className="text-engineering-blue">請求額</span>
                                  <span className="text-engineering-blue">¥{finalAmount.toLocaleString()}</span>
                                </div>
                              </>
                            )
                          })()}
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
