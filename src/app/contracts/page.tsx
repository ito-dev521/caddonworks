"use client"

import React, { useState, useEffect, useRef } from "react"
import { motion } from "framer-motion"
import { FileText, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle, MessageSquare, Eye, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Navigation } from "@/components/layouts/navigation"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { ContractorEvaluationForm } from "@/components/evaluations/contractor-evaluation-form"

interface Contract {
  id: string
  project_id: string
  org_id: string
  contractor_id: string
  contract_title: string
  contract_content: string
  bid_amount: number
  start_date: string
  end_date: string
  status: string
  contractor_signed_at?: string
  org_signed_at?: string
  signed_at?: string
  created_at: string
  updated_at: string
  project_title?: string
  org_name?: string
  contractor_name?: string
  contractor_email?: string
}

interface Invoice {
  id: string
  project_id: string
  invoice_number: string
  contractor_id: string
  org_id: string
  amount: number
  tax_rate: number
  tax_amount: number
  total_amount: number
  issue_date: string
  due_date: string
  paid_date?: string
  status: string
  description: string
  billing_details: any
  created_at: string
  updated_at: string
}

function ContractsPageContent() {
  const { userProfile, userRole } = useAuth()
  const router = useRouter()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([])
  const [completedProjects, setCompletedProjects] = useState<any[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'signed' | 'pending' | 'invoices'>('signed')
  const lastFetchKeyRef = useRef<string | null>(null)
  
  // 評価フォームの状態管理
  const [showEvaluationForm, setShowEvaluationForm] = useState(false)
  const [evaluationTarget, setEvaluationTarget] = useState<{
    projectId: string
    contractId: string
    contractorId: string
    contractorName: string
  } | null>(null)
  const [evaluatedProjects, setEvaluatedProjects] = useState<Set<string>>(new Set())
  const [invoicedProjects, setInvoicedProjects] = useState<Set<string>>(new Set())
  const [invoiceStatuses, setInvoiceStatuses] = useState<Map<string, any>>(new Map())

  // 契約一覧を取得
  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        const allContracts = result.contracts || []

        if (allContracts.length === 0) {
          setContracts([])
          setPendingContracts([])
        } else {
          // 署名済み契約と署名待ち契約を分ける
          const signedContracts = allContracts.filter((contract: any) =>
            contract.status === 'signed' || contract.status === 'completed'
          )
          const pendingContracts = allContracts.filter((contract: any) =>
            contract.status === 'pending_contractor' || contract.status === 'pending_org'
          )

          setContracts(signedContracts)
          setPendingContracts(pendingContracts)
        }
      } else {
        console.error('契約取得エラー:', result.message)
        setError(result.message || '契約データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('契約取得エラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  // 完了案件を取得（請求書発行用）
  const fetchCompletedProjects = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        return
      }

      // プロジェクトと契約データを並行して取得
      const [projectsResponse, contractsResponse] = await Promise.all([
        fetch('/api/projects?status=completed', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch('/api/contracts', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ])

      if (projectsResponse.ok && contractsResponse.ok) {
        const [projectsResult, contractsResult] = await Promise.all([
          projectsResponse.json(),
          contractsResponse.json()
        ])
        
        const projects = projectsResult.projects || []
        const allContracts = contractsResult.contracts || []
        
        setCompletedProjects(projects)
        
        // 評価済みと請求書作成済みの状態を確認（契約データも渡す）
        await checkProjectStatuses(projects, allContracts)
      }
    } catch (err: any) {
      console.error('完了案件取得エラー:', err)
    }
  }

  // 請求書を取得（受注者用）
  const fetchInvoices = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        return
      }

      const response = await fetch('/api/invoices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setInvoices(result.invoices || [])
      }
    } catch (err: any) {
      console.error('請求書取得エラー:', err)
    }
  }

  useEffect(() => {
    if (!userProfile || !userRole) {
      setLoading(false)
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ（開発時のStrictMode重複実行対策）
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    fetchContracts()
    if (userRole === 'OrgAdmin') {
      fetchCompletedProjects()
    } else if (userRole === 'Contractor') {
      fetchInvoices()
    }
  }, [userProfile, userRole])

  // 契約を月毎にグループ化
  const groupContractsByMonth = (contracts: Contract[]) => {
    const grouped = contracts.reduce((acc, contract) => {
      const date = new Date(contract.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthName: date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' }),
          contracts: []
        }
      }
      acc[monthKey].contracts.push(contract)
      return acc
    }, {} as Record<string, { monthName: string; contracts: Contract[] }>)

    return Object.values(grouped).sort((a, b) => b.monthName.localeCompare(a.monthName))
  }

  // 契約に署名
  const handleSignContract = async (contractId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      const response = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        // 契約一覧を再取得
        await fetchContracts()
      } else {
        setError(result.message || '契約の署名に失敗しました')
      }
    } catch (err: any) {
      console.error('契約署名エラー:', err)
      setError('サーバーエラーが発生しました')
    }
  }

  // 業務完了届作成機能（実際は請求書を作成）
  const generateInvoice = async (projectId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        alert('認証が必要です')
        return
      }

      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: projectId,
          type: 'completion'
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('業務完了届が作成されました。受注者に通知が送信されます。')
        // 完了案件リストを再取得（状態も更新される）
        await fetchCompletedProjects()
      } else {
        alert('業務完了届作成に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('業務完了届作成エラー:', error)
      alert('ネットワークエラーが発生しました')
    }
  }

  // 評価フォームを開く
  const openEvaluationForm = (project: any) => {
    // 既に評価済みの場合は開かない
    if (evaluatedProjects.has(project.id)) {
      alert('この案件は既に評価済みです。')
      return
    }

    const contract = contracts.find(c => c.project_id === project.id)
    if (contract) {
      setEvaluationTarget({
        projectId: project.id,
        contractId: contract.id,
        contractorId: project.contractor_id,
        contractorName: project.contractor_name || '受注者'
      })
      setShowEvaluationForm(true)
    }
  }

  // 評価完了時の処理
  const handleEvaluationSuccess = () => {
    if (evaluationTarget) {
      setEvaluatedProjects(prev => new Set(Array.from(prev).concat(evaluationTarget.projectId)))
    }
    setShowEvaluationForm(false)
    setEvaluationTarget(null)
    alert('評価が完了しました。業務完了届作成ボタンが有効になりました。')
  }

  // 評価フォームをキャンセル
  const handleEvaluationCancel = () => {
    setShowEvaluationForm(false)
    setEvaluationTarget(null)
  }

  // プロジェクトの状態を確認（評価済み、請求書作成済み）
  const checkProjectStatuses = async (projects: any[], contractsData: Contract[]) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        console.error('セッション取得エラー:', sessionError)
        return
      }
      if (!session) {
        return
      }

      const evaluatedSet = new Set<string>()
      const invoicedSet = new Set<string>()
      const invoiceMap = new Map<string, any>()

      // 各プロジェクトの状態を並行して確認
      const statusPromises = projects.map(async (project) => {
        const contract = contractsData.find(c => c.project_id === project.id)

        // 評価データの取得
        let evaluationResponse = null
        try {
          evaluationResponse = await fetch(`/api/evaluations/contractor?contractor_id=${project.contractor_id}&project_id=${project.id}`, {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          })
        } catch (error) {
          console.error(`プロジェクト ${project.id} の評価データ取得でエラー:`, error)
          evaluationResponse = null
        }

        // 請求書データの取得（契約が存在する場合のみ）
        let invoiceResponse = null
        if (contract) {
          try {
            invoiceResponse = await fetch(`/api/invoices/contract/${contract.id}`, {
              headers: { 'Authorization': `Bearer ${session.access_token}` }
            })
          } catch (error) {
            console.error(`プロジェクト ${project.id} の請求書取得でネットワークエラー:`, error)
            invoiceResponse = null
          }
        }

        if (evaluationResponse && evaluationResponse.ok) {
          const evalResult = await evaluationResponse.json()
          if (evalResult.evaluations && evalResult.evaluations.length > 0) {
            evaluatedSet.add(project.id)
          }
        } else if (evaluationResponse) {
          console.error(`プロジェクト ${project.id} の評価データ取得エラー:`, evaluationResponse.status, evaluationResponse.statusText)
        }

        if (invoiceResponse && invoiceResponse.ok) {
          const invoiceResult = await invoiceResponse.json()
          if (invoiceResult.invoice) {
            invoicedSet.add(project.id)
            invoiceMap.set(project.id, invoiceResult.invoice)
          }
        } else if (invoiceResponse) {
          console.error(`プロジェクト ${project.id} の請求書取得エラー:`, invoiceResponse.status, invoiceResponse.statusText)
        }
      })

      await Promise.all(statusPromises)
      
      setEvaluatedProjects(evaluatedSet)
      setInvoicedProjects(invoicedSet)
      setInvoiceStatuses(invoiceMap)
    } catch (error) {
      console.error('プロジェクト状態確認エラー:', error)
    }
  }

  // プロジェクトが評価済みかチェック
  const isProjectEvaluated = async (projectId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return false

      const response = await fetch(`/api/evaluations/contractor?project_id=${projectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        return result.evaluations && result.evaluations.length > 0
      }
      return false
    } catch (error) {
      console.error('評価確認エラー:', error)
      return false
    }
  }

  // 請求書ステータス表示用の関数
  const getInvoiceStatusBadge = (projectId: string) => {
    const invoice = invoiceStatuses.get(projectId)
    if (!invoice) return null

    switch (invoice.status) {
      case 'draft':
        return <Badge variant="outline" className="text-orange-600 border-orange-600">下書き</Badge>
      case 'issued':
        return <Badge variant="default" className="bg-green-600">発行済み</Badge>
      case 'paid':
        return <Badge variant="default" className="bg-blue-600">支払済み</Badge>
      default:
        return <Badge variant="outline">{invoice.status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!userProfile || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ログインが必要です</h2>
          <p className="text-gray-600 mb-4">契約管理ページにアクセスするにはログインしてください。</p>
          <Button onClick={() => window.location.href = '/auth/login'} variant="engineering">
            ログインページへ
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">エラーが発生しました</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchContracts} variant="engineering">
            再試行
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-6xl mx-auto"
        >
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">契約管理</h1>
            <p className="text-gray-600">
              {userRole === 'OrgAdmin' ? '発注者としての契約一覧' : '受注者としての契約一覧'}
            </p>
          </div>

          {/* タブ */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setSelectedTab('signed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'signed'
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  署名済み契約
                  {contracts.length > 0 && (
                    <span className="ml-2 bg-engineering-blue text-white text-xs px-2 py-1 rounded-full">
                      {contracts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'pending'
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  署名待ち契約
                  {pendingContracts.length > 0 && (
                    <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      {pendingContracts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('invoices')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'invoices'
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {userRole === 'OrgAdmin' ? '業務完了届発行' : '請求書'}
                  {(userRole === 'OrgAdmin' && completedProjects.length > 0) && (
                    <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                      {completedProjects.length}
                    </span>
                  )}
                  {(userRole === 'Contractor' && invoices.length > 0) && (
                    <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                      {invoices.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* 契約一覧 */}
          {selectedTab === 'signed' && (
            // 署名済み契約
            contracts.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">署名済み契約がありません</h3>
                <p className="text-gray-600">
                  まだ署名済みの契約がありません。
                </p>
              </Card>
            ) : (
              <div className="space-y-8">
                {groupContractsByMonth(contracts).map((monthGroup, monthIndex) => (
                  <div key={monthIndex}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      {monthGroup.monthName}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({monthGroup.contracts.length}件)
                      </span>
                    </h2>
                    <div className="grid gap-4">
                      {monthGroup.contracts.map((contract) => (
                        <motion.div
                          key={contract.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card className="p-6 border-l-4 border-l-green-500">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                  {contract.project_title}
                                </h3>
                                <p className="text-sm text-gray-600 mb-2">契約ID: {contract.id.slice(0, 8).toUpperCase()}</p>
                                <Badge variant="default" className="bg-green-100 text-green-800">
                                  署名完了
                                </Badge>
                              </div>
                              <div className="text-right">
                                <p className="text-2xl font-bold text-engineering-blue">
                                  ¥{contract.bid_amount.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">
                                  署名日: {contract.signed_at ? new Date(contract.signed_at).toLocaleDateString('ja-JP') : '不明'}
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                              <div>
                                <span className="text-gray-600">{userRole === 'OrgAdmin' ? '受注者' : '発注者'}:</span>
                                <p className="font-medium text-gray-900">
                                  {userRole === 'OrgAdmin' ? contract.contractor_name : contract.org_name}
                                </p>
                              </div>
                              <div>
                                <span className="text-gray-600">契約期間:</span>
                                <p className="text-gray-900">
                                  {new Date(contract.start_date).toLocaleDateString('ja-JP')} - {new Date(contract.end_date).toLocaleDateString('ja-JP')}
                                </p>
                              </div>
                            </div>

                            {/* アクションボタン */}
                            <div className="flex justify-between items-center">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(`/contracts/${contract.id}`)}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                詳細表示
                              </Button>
                              <Button
                                variant="engineering"
                                size="sm"
                                onClick={() => router.push(`/chat?contractId=${contract.id}`)}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                チャット開始
                              </Button>
                            </div>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {selectedTab === 'pending' && (
            // 署名待ち契約
            pendingContracts.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">署名待ち契約がありません</h3>
                <p className="text-gray-600">
                  現在署名待ちの契約はありません。
                </p>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingContracts.map((contract) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-6 border-l-4 border-l-yellow-500">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {contract.project_title}
                          </h3>
                          <p className="text-sm text-gray-600 mb-2">契約ID: {contract.id.slice(0, 8).toUpperCase()}</p>
                          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                            署名待ち
                          </Badge>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-engineering-blue">
                            ¥{contract.bid_amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            作成日: {new Date(contract.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div>
                          <span className="text-gray-600">{userRole === 'OrgAdmin' ? '受注者' : '発注者'}:</span>
                          <p className="font-medium text-gray-900">
                            {userRole === 'OrgAdmin' ? contract.contractor_name : contract.org_name}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-600">契約期間:</span>
                          <p className="text-gray-900">
                            {new Date(contract.start_date).toLocaleDateString('ja-JP')} - {new Date(contract.end_date).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/contracts/${contract.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          詳細表示
                        </Button>
                        <div className="flex gap-2">
                          {contract.status === 'pending_contractor' && userRole === 'Contractor' && (
                            <Button
                              onClick={() => handleSignContract(contract.id)}
                              variant="engineering"
                              size="sm"
                            >
                              署名する
                            </Button>
                          )}
                          {contract.status === 'pending_org' && userRole === 'OrgAdmin' && (
                            <Button
                              onClick={() => handleSignContract(contract.id)}
                              variant="engineering"
                              size="sm"
                            >
                              署名する
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* 署名状況 */}
                      <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">発注者署名:</span>
                            <span className={`ml-2 ${contract.org_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                              {contract.org_signed_at
                                ? new Date(contract.org_signed_at).toLocaleString('ja-JP')
                                : '未署名'
                              }
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-600">受注者署名:</span>
                            <span className={`ml-2 ${contract.contractor_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                              {contract.contractor_signed_at
                                ? new Date(contract.contractor_signed_at).toLocaleString('ja-JP')
                                : '未署名'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {selectedTab === 'invoices' && (
            userRole === 'OrgAdmin' ? (
              // 業務完了届発行タブ（発注者用）
              completedProjects.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">完了案件がありません</h3>
                  <p className="text-gray-600">
                    業務完了届発行可能な完了案件がありません。
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">業務完了届発行について</h3>
                    <p className="text-sm text-blue-800">
                      完了した案件の業務完了届を発行できます。業務完了届は受注者に送信され、PDF形式でダウンロードも可能です。
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {completedProjects.map((project: any) => (
                      <Card key={project.id} className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                              {project.title}
                            </h3>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">受注者:</span> {project.contractor_name}
                              </div>
                              <div>
                                <span className="font-medium">完了日:</span> {new Date(project.end_date).toLocaleDateString('ja-JP')}
                              </div>
                              <div>
                                <span className="font-medium">契約金額:</span> ¥{project.budget.toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">カテゴリ:</span> {project.category}
                              </div>
                            </div>
                            <Badge className="bg-green-100 text-green-800">
                              完了済み
                            </Badge>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEvaluationForm(project)}
                              disabled={evaluatedProjects.has(project.id)}
                              className={
                                evaluatedProjects.has(project.id)
                                  ? 'bg-green-50 border-green-200 text-green-800 opacity-75 cursor-not-allowed'
                                  : 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100'
                              }
                              title={evaluatedProjects.has(project.id) ? '評価済み' : '受注者を評価する'}
                            >
                              <Star className="w-4 h-4 mr-2" />
                              {evaluatedProjects.has(project.id) ? '評価済み' : '受注者評価'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => generateInvoice(project.id)}
                              disabled={!evaluatedProjects.has(project.id) || invoicedProjects.has(project.id)}
                              className={
                                invoicedProjects.has(project.id)
                                  ? 'bg-green-50 border-green-200 text-green-800 opacity-75 cursor-not-allowed'
                                  : !evaluatedProjects.has(project.id)
                                  ? 'opacity-50 cursor-not-allowed'
                                  : ''
                              }
                              title={
                                invoicedProjects.has(project.id)
                                  ? '業務完了届作成済み'
                                  : !evaluatedProjects.has(project.id)
                                  ? '受注者評価を完了してから業務完了届を作成してください'
                                  : '業務完了届を作成する'
                              }
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              {invoicedProjects.has(project.id) ? '作成済み' : '業務完了届作成'}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // プロジェクトに対応する契約IDを取得
                                const contract = contracts.find(c => c.project_id === project.id)
                                if (contract) {
                                  router.push(`/contracts/${contract.id}`)
                                } else {
                                  alert('この案件の契約情報が見つかりません')
                                }
                              }}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              詳細
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            ) : (
              // 請求書タブ（受注者用）
              invoices.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">請求書がありません</h3>
                  <p className="text-gray-600">
                    まだ請求書が発行されていません。
                  </p>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-2">請求書について</h3>
                    <p className="text-sm text-green-800">
                      発注者から発行された請求書の一覧です。支払い状況を確認し、PDF形式でダウンロードできます。
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {invoices.map((invoice) => (
                      <Card key={invoice.id} className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                                請求書番号: {invoice.invoice_number}
                              </h3>
                              <Badge
                                className={
                                  invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                                  invoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }
                              >
                                {invoice.status === 'paid' ? '支払済み' :
                                 invoice.status === 'overdue' ? '支払期限超過' :
                                 invoice.status === 'sent' ? '送信済み' : '発行済み'}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-4">{invoice.description}</p>
                            <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                              <div>
                                <span className="font-medium">発行日:</span> {new Date(invoice.issue_date).toLocaleDateString('ja-JP')}
                              </div>
                              <div>
                                <span className="font-medium">支払期限:</span> {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                              </div>
                              <div>
                                <span className="font-medium">税抜金額:</span> ¥{invoice.amount.toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">税込金額:</span> ¥{invoice.total_amount.toLocaleString()}
                              </div>
                            </div>
                            {invoice.paid_date && (
                              <div className="text-sm text-green-600 mb-2">
                                支払完了日: {new Date(invoice.paid_date).toLocaleDateString('ja-JP')}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // PDF生成機能（未実装）
                                alert('PDF生成機能は準備中です')
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              PDF表示
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            )
          )}
        </motion.div>
      </div>
      
      {/* 評価フォーム */}
      {showEvaluationForm && evaluationTarget && (
        <ContractorEvaluationForm
          projectId={evaluationTarget.projectId}
          contractId={evaluationTarget.contractId}
          contractorId={evaluationTarget.contractorId}
          contractorName={evaluationTarget.contractorName}
          onSuccess={handleEvaluationSuccess}
          onCancel={handleEvaluationCancel}
        />
      )}
    </div>
  )
}

export default function ContractsPage() {
  return (
    <AuthGuard allowedRoles={['OrgAdmin', 'Contractor']}>
      <ContractsPageContent />
    </AuthGuard>
  )
}