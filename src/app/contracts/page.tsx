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
import { useRouter, useSearchParams } from "next/navigation"
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
    support_enabled?: boolean
    project_support_enabled?: boolean
}

interface Invoice {
  id: string
  project_id: string
  invoice_number: string
  contract_id: string
  amount: number
  tax_amount: number
  total_amount: number
  status: string
  issue_date: string
  due_date: string
  paid_date?: string
  description: string
  billing_details: any
  created_at: string
  updated_at: string
  project?: {
    title?: string
  }
}

interface Project {
  id: string
  title: string
  description?: string
  status: string
  budget: number
  start_date: string
  end_date: string
  contractor_id?: string
  contractor_name?: string
  contractor_email?: string
  progress?: number
  category?: string
  created_at: string
  updated_at: string
  org_id?: string
  completed_at?: string | null
}

function ContractsPageContent() {
  const { userProfile, userRole } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([])
  const [completedProjects, setCompletedProjects] = useState<Project[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'signature' | 'pending' | 'invoice' | 'completion'>('signature')
  const lastFetchKeyRef = useRef<string | null>(null)
  // プロジェクトID -> 契約一覧（完了タブで評価ボタン用）
  const [projectContracts, setProjectContracts] = useState<Record<string, Contract[]>>({})
  
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
  // 完了済みプロジェクトID集合
  const completedProjectIdSet = React.useMemo(() => new Set(completedProjects.map(project => project.id)), [completedProjects])
  // 完了届作成済みプロジェクトID集合
  const [completionReportProjects, setCompletionReportProjects] = useState<Set<string>>(new Set())
  const [completionReports, setCompletionReports] = useState<any[]>([])
  const [creatingCompletionReport, setCreatingCompletionReport] = useState<string | null>(null)
  const [supportPercent, setSupportPercent] = useState<number>(8)
  const [loadingSupport, setLoadingSupport] = useState<boolean>(false)

  // 認証付きでPDFを開く（window.open だとAuthorizationが付かないため）
  const openPdfWithAuth = async (url: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('認証が必要です')
        return
      }
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      })
      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let errorMessage = 'PDFを表示できませんでした'
        try {
          const errorJson = JSON.parse(text)
          errorMessage = errorJson.message || errorMessage
        } catch {
          // JSONパースエラーは無視
        }
        console.error('PDF取得エラー:', res.status, text)
        alert(`${errorMessage} (ステータス: ${res.status})`)
        return
      }
      const blob = await res.blob()
      const pdfUrl = URL.createObjectURL(blob)
      window.open(pdfUrl, '_blank')
    } catch (e) {
      console.error('openPdfWithAuth error:', e)
      alert(`PDFの取得に失敗しました: ${e instanceof Error ? e.message : '不明なエラー'}`)
    }
  }

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

      if (response.ok) {
        const result = await response.json()
        
        const allContracts = result.contracts || []
        
        // 署名済み契約と署名待ち契約を分離
        const signed = allContracts.filter((contract: Contract) => contract.status === 'signed')
        const pending = allContracts.filter((contract: Contract) => 
          contract.status === 'pending' || 
          contract.status === 'pending_contractor' || 
          contract.status === 'pending_org'
        )
        
        setContracts(signed)
        setPendingContracts(pending)
      } else {
        const errorResult = await response.json()
        console.error('契約取得エラー:', errorResult)
        setError(errorResult.message || '契約データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('契約取得エラー:', err)
      setError('契約データの取得に失敗しました')
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

      // プロジェクト、契約、完了届データを並行して取得
      const [projectsResponse, contractsResponse, completionReportsResponse] = await Promise.all([
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
        }),
        fetch('/api/completion-reports', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }).catch(() => ({ ok: false })) // 完了届APIが未対応の場合もあるため
      ])

      if (projectsResponse.ok && contractsResponse.ok) {
        const [projectsResult, contractsResult] = await Promise.all([
          projectsResponse.json(),
          contractsResponse.json()
        ])

        const now = Date.now()
        const rawProjects: Project[] = (projectsResult.projects || []).map((proj: any) => ({
          id: proj.id,
          title: proj.title,
          description: proj.description,
          status: proj.status,
          budget: proj.budget,
          start_date: proj.start_date,
          end_date: proj.end_date,
          contractor_id: proj.contractor_id,
          contractor_name: proj.contractor_name,
          contractor_email: proj.contractor_email,
          progress: proj.progress,
          category: proj.category,
          created_at: proj.created_at,
          updated_at: proj.updated_at,
          org_id: proj.org_id,
          completed_at: proj.completed_at ?? null
        }))

        const projects = rawProjects.filter((project) => {
          if (project.status !== 'completed') return true
          if (!project.completed_at) return true
          const completedAt = new Date(project.completed_at).getTime()
          const diffDays = (now - completedAt) / (1000 * 60 * 60 * 24)
          return diffDays <= 14
        })
        const allContracts: Contract[] = contractsResult.contracts || []

        setCompletedProjects(projects)

        // 完了届の状態を確認
        if (completionReportsResponse.ok) {
          const completionReportsResult = await completionReportsResponse.json()
          const reports = (completionReportsResult || []) as Array<{ project_id: string }>
          const reportProjectIds = new Set<string>(reports.map(report => report.project_id))
          setCompletionReportProjects(reportProjectIds)
        }

        // 評価済みと請求書作成済みの状態を確認（契約データも渡す）
        await checkProjectStatuses(projects, allContracts)

        // プロジェクトごとの契約を保持（評価ボタンで使用）
        const grouped = allContracts.reduce<Record<string, Contract[]>>((acc, contractItem) => {
          if (!acc[contractItem.project_id]) acc[contractItem.project_id] = []
          acc[contractItem.project_id].push(contractItem)
          return acc
        }, {})
        setProjectContracts(grouped)
      }
    } catch (err: any) {
      console.error('完了案件取得エラー:', err)
    }
  }

  // 公開設定（手数料％）取得
  const fetchSupportPercent = async () => {
    try {
      setLoadingSupport(true)
      const res = await fetch('/api/settings/public')
      const data = await res.json()
      if (res.ok && typeof data.support_fee_percent === 'number') {
        setSupportPercent(data.support_fee_percent)
      }
    } catch (_) {
      // ignore
    } finally {
      setLoadingSupport(false)
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

  // 業務完了届を取得（受注者用）
  const fetchCompletionReports = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        return
      }

      const response = await fetch('/api/completion-reports', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        const reports = (result || []) as Array<any>
        setCompletionReports(reports)
        setCompletionReportProjects(new Set(reports.map(report => report.project_id)))
      } else {
        // サーバーエラーの場合は空配列を設定（機能準備中として表示）
        console.warn('業務完了届API未対応:', response.status)
        setCompletionReports([])
        setCompletionReportProjects(new Set())
      }
    } catch (err: any) {
      console.error('業務完了届取得エラー:', err)
      setCompletionReports([])
      setCompletionReportProjects(new Set())
    }
  }

  // プロジェクトの状態を確認（評価済み・請求書作成済み）
  const checkProjectStatuses = async (projects: any[], contractsData: Contract[]) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        return
      }

      const evaluatedSet = new Set<string>()
      const invoicedSet = new Set<string>()

      // 各プロジェクトの状態を並行して確認
      const statusPromises = projects.map(async (project) => {
        const contract = contractsData.find(c => c.project_id === project.id)

        // 評価データの取得
        let evaluationResponse = null
        try {
          evaluationResponse = await fetch(`/api/evaluations/contractor?project_id=${project.id}`, {
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
          }
        } else if (invoiceResponse) {
          console.error(`プロジェクト ${project.id} の請求書データ取得エラー:`, invoiceResponse.status, invoiceResponse.statusText)
        }
      })

      await Promise.all(statusPromises)

      setEvaluatedProjects(evaluatedSet)
      setInvoicedProjects(invoicedSet)
    } catch (err: any) {
      console.error('プロジェクト状態確認エラー:', err)
    }
  }

  const isProjectEvaluated = (projectId: string) => {
    return evaluatedProjects.has(projectId)
  }

  const isCompletionReportCreated = (projectId: string) => {
    return completionReportProjects.has(projectId)
  }

  // 契約をプロジェクトごとにグループ化（複数受注者対応）
  const groupContractsByProject = (contracts: Contract[]) => {
    const grouped = contracts.reduce((acc, contract) => {
      const projectKey = contract.project_id
      if (!acc[projectKey]) {
        acc[projectKey] = {
          projectTitle: contract.project_title || contract.contract_title,
          projectId: contract.project_id,
          contracts: []
        }
      }
      acc[projectKey].contracts.push(contract)
      return acc
    }, {} as Record<string, { projectTitle: string; projectId: string; contracts: Contract[] }>)

    return Object.values(grouped)
  }

  // 評価フォームを開く
  const handleEvaluateContractor = (project: any, contract: Contract) => {
    setEvaluationTarget({
      projectId: project.id,
      contractId: contract.id,
      contractorId: contract.contractor_id,
      contractorName: contract.contractor_name || 'Unknown'
    })
    setShowEvaluationForm(true)
  }

  // 受注者: サポート利用トグル（落札後）
  const toggleSupportForContractor = async (contract: Contract, enable: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return alert('認証が必要です')
      if (enable) {
        const ok = confirm(`サポートを利用すると契約金の${supportPercent}%が控除されます。よろしいですか？`)
        if (!ok) return
      }
      const res = await fetch(`/api/contracts/${contract.id}/support`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ enable })
      })
      const data = await res.json()
      if (res.ok) {
        alert(enable ? 'サポートを有効化しました' : 'サポートを無効化しました')
        fetchContracts()
      } else {
        alert(data.message || '更新に失敗しました')
      }
    } catch (e) {
      alert('更新に失敗しました')
    }
  }

  // 評価成功時の処理
  const handleEvaluationSuccess = () => {
    setShowEvaluationForm(false)
    setEvaluationTarget(null)
    // 完了案件を再取得して状態を更新
    fetchCompletedProjects()
    
    // 成功メッセージを表示
    alert('評価が完了しました。受注者に通知が送信されました。')
  }

  // 評価キャンセル時の処理
  const handleEvaluationCancel = () => {
    setShowEvaluationForm(false)
    setEvaluationTarget(null)
  }

  // 業務完了届の作成
  const handleCreateCompletionReport = async (projectId: string) => {
    try {
      setCreatingCompletionReport(projectId)

      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        alert('認証エラーが発生しました')
        return
      }

      // プロジェクトの契約情報を取得
      const projectContract = projectContracts[projectId]?.[0]
      if (!projectContract) {
        alert('契約情報が見つかりません')
        return
      }

      const response = await fetch('/api/completion-reports', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: projectId,
          contract_id: projectContract.id,
          actual_completion_date: new Date().toISOString().split('T')[0],
          status: 'submitted'
        })
      })

      const result = await response.json()

      if (response.ok) {
        if (result.alreadyExists) {
          alert('業務完了届は既に作成済みです')
        } else {
          alert('業務完了届を作成しました。受注者に通知が送信されました。')
          // 完了届作成済み状態を更新
          setCompletionReportProjects(prev => {
            const next = new Set(prev)
            next.add(projectId)
            return next
          })
          // 完了案件を再取得して状態を更新
          fetchCompletedProjects()
        }
      } else {
        console.error('業務完了届作成エラー:', result)
        alert(`業務完了届の作成に失敗しました: ${result.message || '不明なエラー'}`)
      }
    } catch (err: any) {
      console.error('業務完了届作成エラー:', err)
      alert('業務完了届の作成に失敗しました')
    } finally {
      setCreatingCompletionReport(null)
    }
  }

  // 業務完了届のデジタル署名
  const handleSignCompletionReport = async (reportId: string) => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        alert('認証エラーが発生しました')
        return
      }

      // 署名確認
      const confirmSign = confirm('業務完了届にデジタル署名を開始しますか？Box Signのページが開きます。')
      if (!confirmSign) return

      const response = await fetch(`/api/completion-reports/${reportId}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        alert('デジタル署名リクエストを作成しました。署名ページに移動します。')
        // 署名ページに移動
        if (result.signing_urls && result.signing_urls.length > 0) {
          window.open(result.signing_urls[0], '_blank')
        }
        fetchCompletionReports() // 再取得
      } else {
        alert(`署名リクエストの作成に失敗しました: ${result.message || '不明なエラー'}`)
      }
    } catch (err: any) {
      console.error('署名エラー:', err)
      alert('署名リクエストの作成に失敗しました')
    }
  }

  // URLパラメータからタブを設定
  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab && ['signature', 'pending', 'invoice', 'completion'].includes(tab)) {
      setSelectedTab(tab as 'signature' | 'pending' | 'invoice' | 'completion')
    }
  }, [searchParams])

  useEffect(() => {
    if (userProfile && userRole) {
      fetchContracts()
      
      if (userRole === 'OrgAdmin') {
        fetchCompletedProjects()
      } else if (userRole === 'Contractor') {
        fetchInvoices()
        fetchCompletionReports()
      }
      fetchSupportPercent()
    }
  }, [userProfile, userRole])

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />
      {loading ? (
        <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
            <p className="text-gray-600">読み込み中...</p>
          </div>
        </div>
      ) : error ? (
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
      ) : (
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

            {/* タブナビゲーション */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setSelectedTab('signature')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === 'signature'
                        ? 'border-engineering-blue text-engineering-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    署名済み契約
                    {contracts.length > 0 && (
                      <span className="ml-2 inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-semibold bg-engineering-blue/10 text-engineering-blue">
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
                    onClick={() => setSelectedTab('invoice')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      selectedTab === 'invoice'
                        ? 'border-engineering-blue text-engineering-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {userRole === 'OrgAdmin' ? '業務完了届発行' : '請求書'}
                    {(userRole === 'OrgAdmin' && completedProjects.filter(project => !invoicedProjects.has(project.id)).length > 0) && (
                      <span className="ml-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                        {completedProjects.filter(project => !invoicedProjects.has(project.id)).length}
                      </span>
                    )}
                    {(userRole === 'Contractor' && invoices.length > 0) && (
                      <span className="ml-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                        {invoices.length}
                      </span>
                    )}
                  </button>
                  {userRole === 'Contractor' && (
                    <button
                      onClick={() => setSelectedTab('completion')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        selectedTab === 'completion'
                          ? 'border-engineering-blue text-engineering-blue'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      業務完了届
                      {completionReportProjects.size > 0 && (
                        <span className="ml-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                          {completionReportProjects.size}
                        </span>
                      )}
                    </button>
                  )}
                </nav>
              </div>
            </div>

            {/* 契約一覧 */}
            {selectedTab === 'signature' && (
              contracts.length === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">署名済み契約がありません</h3>
                  <p className="text-gray-600">
                    署名済みの契約がありません。
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupContractsByProject(contracts).map((projectGroup, projectIndex) => (
                    <div key={projectIndex}>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        {projectGroup.projectTitle}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({projectGroup.contracts.length}件の契約)
                        </span>
                      </h2>
                      <div className="grid gap-4">
                        {projectGroup.contracts.map((contract) => (
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
                                    {contract.contract_title || contract.project_title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">契約ID: {contract.id.slice(0, 8).toUpperCase()}</p>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge variant="default" className="bg-green-100 text-green-800">
                                      署名完了
                                    </Badge>
                                    {contract.project_support_enabled && (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                        発注者サポート利用
                                      </Badge>
                                    )}
                                    {contract.support_enabled && (
                                      <Badge className="bg-green-100 text-green-800 border-green-200">
                                        受注者サポート利用
                                      </Badge>
                                    )}
                                  </div>
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
                                {userRole === 'OrgAdmin' && completedProjectIdSet.has(contract.project_id) && (
                                  <div className="col-span-2 flex justify-end">
                                    {evaluatedProjects.has(contract.project_id) ? (
                                      <Button
                                        disabled
                                        className="bg-gray-300 text-gray-700 cursor-not-allowed"
                                        size="sm"
                                      >
                                        評価済み
                                      </Button>
                                    ) : (
                                      <Button
                                        className="bg-green-500 hover:bg-green-600 text-white"
                                        size="sm"
                                        onClick={() => handleEvaluateContractor({ id: contract.project_id }, contract)}
                                      >
                                        受注者評価
                                      </Button>
                                    )}
                                  </div>
                                )}
                                {userRole === 'Contractor' && (
                                  <div className="col-span-2 flex justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => toggleSupportForContractor(contract, !contract.support_enabled)}
                                      disabled={!!contract.support_enabled || !!contract.project_support_enabled || completedProjectIdSet.has(contract.project_id)}
                                      title={
                                        completedProjectIdSet.has(contract.project_id)
                                          ? '案件が完了済みのため、サポートの有効化はできません'
                                          : contract.project_support_enabled
                                          ? '発注者側でサポートが有効なため、受注者側の有効化はできません'
                                          : contract.support_enabled
                                          ? 'サポートは有効化済みです'
                                          : `有効化すると${supportPercent}%が控除されます`
                                      }
                                    >
                                      {
                                        completedProjectIdSet.has(contract.project_id)
                                          ? '案件完了済み'
                                          : contract.project_support_enabled
                                          ? '発注者サポート有効'
                                          : contract.support_enabled
                                          ? 'サポート有効化済み'
                                          : loadingSupport
                                          ? '読み込み中...'
                                          : `サポート利用（${supportPercent}%）`
                                      }
                                    </Button>
                                  </div>
                                )}
                              </div>
                              
                              {/* 複数受注者対応の表示 */}
                              {userRole === 'OrgAdmin' && (
                                <div className="bg-blue-50 p-3 rounded-lg mb-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-blue-700">この受注者との契約金額:</span>
                                    <span className="font-semibold text-blue-900">¥{contract.bid_amount.toLocaleString()}</span>
                                  </div>
                                  <p className="text-xs text-blue-600 mt-1">
                                    受注者: {contract.contractor_name} 様
                                  </p>
                                </div>
                              )}

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
              pendingContracts.length === 0 ? (
                <Card className="p-8 text-center">
                  <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">署名待ち契約がありません</h3>
                  <p className="text-gray-600">
                    署名待ちの契約がありません。
                  </p>
                </Card>
              ) : (
                <div className="space-y-8">
                  {groupContractsByProject(pendingContracts).map((projectGroup, projectIndex) => (
                    <div key={projectIndex}>
                      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="w-5 h-5 mr-2" />
                        {projectGroup.projectTitle}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          ({projectGroup.contracts.length}件の契約)
                        </span>
                      </h2>
                      <div className="grid gap-4">
                        {projectGroup.contracts.map((contract) => (
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
                                    {contract.contract_title || contract.project_title}
                                  </h3>
                                  <p className="text-sm text-gray-600 mb-2">契約ID: {contract.id.slice(0, 8).toUpperCase()}</p>
                                  <div className="flex gap-2 flex-wrap">
                                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                                      {contract.status === 'pending_contractor' ? '受注者署名待ち' :
                                       contract.status === 'pending_org' ? '発注者署名待ち' : '署名待ち'}
                                    </Badge>
                                    {contract.project_support_enabled && (
                                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                                        発注者サポート利用
                                      </Badge>
                                    )}
                                    {contract.support_enabled && (
                                      <Badge className="bg-green-100 text-green-800 border-green-200">
                                        受注者サポート利用
                                      </Badge>
                                    )}
                                  </div>
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
                              
                              {/* 複数受注者対応の表示 */}
                              {userRole === 'OrgAdmin' && (
                                <div className="bg-orange-50 p-3 rounded-lg mb-4">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-orange-700">この受注者との契約金額:</span>
                                    <span className="font-semibold text-orange-900">¥{contract.bid_amount.toLocaleString()}</span>
                                  </div>
                                  <p className="text-xs text-orange-600 mt-1">
                                    受注者: {contract.contractor_name} 様
                                  </p>
                                </div>
                              )}

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
                                      onClick={() => router.push(`/contracts/${contract.id}`)}
                                      variant="engineering"
                                      size="sm"
                                    >
                                      署名する
                                    </Button>
                                  )}
                                  {contract.status === 'pending_org' && userRole === 'OrgAdmin' && (
                                    <Button
                                      onClick={() => router.push(`/contracts/${contract.id}`)}
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
                    </div>
                  ))}
                </div>
              )
            )}

            {selectedTab === 'invoice' && (
              userRole === 'OrgAdmin' ? (
                // 業務完了届発行タブ（発注者用）
                completedProjects.filter(project => !invoicedProjects.has(project.id)).length === 0 ? (
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
                      {completedProjects.filter(project => !invoicedProjects.has(project.id)).map((project: any) => (
                        <Card key={project.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {project.title}
                              </h3>
                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                                <div>
                                  <span className="font-medium">受注者:</span> {project.contractor_name || 'Unknown'}
                                </div>
                                <div>
                                  <span className="font-medium">完了日:</span> {project.completed_at ? new Date(project.completed_at).toLocaleDateString('ja-JP') : '不明'}
                                </div>
                                <div>
                                  <span className="font-medium">カテゴリ:</span> {project.category || '未設定'}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {/* 評価ボタン（発注者のみ） */}
                              {userRole === 'OrgAdmin' && projectContracts[project.id] && projectContracts[project.id][0] && (
                                evaluatedProjects.has(project.id) ? (
                                  <Button
                                    disabled
                                    className="bg-gray-300 text-gray-700 cursor-not-allowed"
                                    size="sm"
                                  >
                                    評価済み
                                  </Button>
                                ) : (
                                  <Button
                                    className="bg-green-500 hover:bg-green-600 text-white"
                                    size="sm"
                                    onClick={() => handleEvaluateContractor({ id: project.id }, projectContracts[project.id][0])}
                                  >
                                    受注者評価
                                  </Button>
                                )
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleCreateCompletionReport(project.id)}
                                disabled={!evaluatedProjects.has(project.id) || isCompletionReportCreated(project.id) || creatingCompletionReport === project.id}
                                title={!evaluatedProjects.has(project.id) ? '受注者評価が未完了のため完了届は作成できません' : (isCompletionReportCreated(project.id) ? '既に作成済みです' : '')}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                {creatingCompletionReport === project.id ? '作成中...' : (isCompletionReportCreated(project.id) ? '作成済み' : (!evaluatedProjects.has(project.id) ? '評価待ち' : '完了届作成'))}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  // 完了届IDを取得してPDFを表示
                                  try {
                                    const { data: { session } } = await supabase.auth.getSession()
                                    if (!session) {
                                      alert('認証が必要です')
                                      return
                                    }

                                    const response = await fetch(`/api/completion-reports?project_id=${project.id}`, {
                                      headers: {
                                        'Authorization': `Bearer ${session.access_token}`
                                      }
                                    })

                                    if (response.ok) {
                                      const reports = await response.json()
                                      if (reports.length > 0) {
                                        openPdfWithAuth(`/api/completion-reports/${reports[0].id}/pdf`)
                                      } else {
                                        alert('完了届が見つかりません')
                                      }
                                    } else {
                                      const errorData = await response.json().catch(() => ({}))
                                      console.error('完了届取得エラー:', response.status, errorData)
                                      alert(`完了届の取得に失敗しました: ${errorData.message || response.statusText}`)
                                    }
                                  } catch (error) {
                                    console.error('PDF表示エラー:', error)
                                    alert(`エラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
                                  }
                                }}
                                disabled={!isCompletionReportCreated(project.id)}
                                title={!isCompletionReportCreated(project.id) ? '完了届が作成されていません' : ''}
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
              ) : (
                // 請求書タブ（受注者用）
                invoices.length === 0 ? (
                  <Card className="p-8 text-center">
                    <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">請求書がありません</h3>
                    <p className="text-gray-600">
                      発行された請求書がありません。
                    </p>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {invoices.map((invoice) => (
                      <Card key={invoice.id} className="p-6">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                  請求書番号: {invoice.invoice_number}
                                </h3>
                                <div className="text-sm text-gray-600 mt-1">
                                  案件名: {invoice.project?.title || '—'}
                                </div>
                              </div>
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
                                <span className="font-medium">税抜金額:</span> ¥{Number(invoice?.amount ?? 0).toLocaleString()}
                              </div>
                              <div>
                                <span className="font-medium">税込金額:</span> ¥{Number(invoice?.total_amount ?? 0).toLocaleString()}
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
                              onClick={() => openPdfWithAuth(`/api/invoices?id=${invoice.id}`)}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              PDF表示
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )
              )
            )}

            {/* 業務完了届タブ（受注者用） */}
            {selectedTab === 'completion' && userRole === 'Contractor' && (
              completionReportProjects.size === 0 ? (
                <Card className="p-8 text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">業務完了届機能</h3>
                  <p className="text-gray-600 mb-4">
                    現在、業務完了届機能は準備中です。<br/>
                    発注者から業務完了届が発行されると、ここに表示されます。
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg text-left">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 業務完了届の流れ</h4>
                    <ol className="text-sm text-blue-800 space-y-1">
                      <li>1. 発注者が案件完了後に「業務完了届発行」</li>
                      <li>2. 受注者（あなた）がこのページで確認・署名</li>
                      <li>3. 署名後にPDF形式でダウンロード可能</li>
                    </ol>
                  </div>
                </Card>
              ) : (
                <div className="space-y-6">
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-purple-900 mb-2">業務完了届について</h3>
                    <p className="text-sm text-purple-800">
                      発注者から発行された業務完了届の確認と署名を行えます。署名後はPDF形式でダウンロードも可能です。
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {completionReports.map((report) => {
                      const projectContract = projectContracts[report.project_id]?.[0]
                      const project = completedProjects.find(p => p.id === report.project_id)

                      return (
                        <Card key={report.id} className="p-6">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {report.projects?.title || project?.title || '案件名不明'}
                                </h3>
                                <Badge
                                  className={
                                    report.status === 'approved' ? 'bg-green-100 text-green-800' :
                                    report.status === 'submitted' ? 'bg-blue-100 text-blue-800' :
                                    report.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }
                                >
                                  {report.status === 'approved' ? '承認済み' :
                                   report.status === 'submitted' ? '提出済み' :
                                   report.status === 'rejected' ? '差し戻し' : '下書き'}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                                <div>
                                  <span className="font-medium">実際の完了日:</span> {new Date(report.actual_completion_date).toLocaleDateString('ja-JP')}
                                </div>
                                <div>
                                  <span className="font-medium">提出日:</span> {report.submission_date ? new Date(report.submission_date).toLocaleDateString('ja-JP') : '未提出'}
                                </div>
                                {projectContract && (
                                  <div>
                                    <span className="font-medium">契約金額:</span> ¥{projectContract.bid_amount.toLocaleString()}
                                  </div>
                                )}
                              </div>

                              {/* 署名状況 */}
                              <div className="border-t pt-4 mb-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">受注者署名:</span>
                                    <span className={`ml-2 ${report.contractor_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                                      {report.contractor_signed_at
                                        ? new Date(report.contractor_signed_at).toLocaleString('ja-JP')
                                        : '未署名'
                                      }
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">承認日:</span>
                                    <span className={`ml-2 ${report.approved_at ? 'text-green-600' : 'text-gray-400'}`}>
                                      {report.approved_at
                                        ? new Date(report.approved_at).toLocaleString('ja-JP')
                                        : '未承認'
                                      }
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="flex gap-2 ml-4">
                              {!report.contractor_signed_at && (
                                <Button
                                  variant="engineering"
                                  size="sm"
                                  onClick={() => handleSignCompletionReport(report.id)}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  署名する
                                </Button>
                              )}

                              {report.contractor_signed_at && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openPdfWithAuth(`/api/completion-reports/${report.id}/pdf`)}
                                >
                                  <FileText className="w-4 h-4 mr-2" />
                                  PDF表示
                                </Button>
                              )}
                            </div>
                          </div>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )
            )}
          </motion.div>
        </div>
      )}

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
    <AuthGuard allowedRoles={['OrgAdmin', 'Staff', 'Contractor']}>
      <ContractsPageContent />
    </AuthGuard>
  )
}
