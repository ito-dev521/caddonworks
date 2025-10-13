"use client"

import React, { useEffect, useState, useCallback, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Building,
  Search,
  Filter,
  Calendar,
  DollarSign,
  MapPin,
  Clock,
  Eye,
  Hand,
  User,
  FileText,
  AlertCircle,
  CheckCircle,
  X
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatBudget } from "@/lib/utils"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"
import { AuthGuard } from "@/components/auth/auth-guard"
import { MEMBER_LEVELS, type MemberLevel } from "@/lib/member-level"
import { FilePreviewModal } from "@/components/FilePreviewModal"

interface JobData {
  id: string
  title: string
  description: string
  status: string
  budget: number
  start_date: string
  end_date: string
  category: string
  created_at: string
  org_name: string
  org_id: string
  assignee_name?: string
  bidding_deadline?: string
  requirements?: string
  location?: string
  required_contractors: number
  current_bid_count: number
  is_full: boolean
  is_expired: boolean
  can_bid: boolean
  advice: string
  contractor_id?: string
  required_level?: MemberLevel
  is_declined?: boolean
  contract_amount?: number // 契約金額（落札案件の場合）
  support_enabled?: boolean // プロジェクトレベルのサポート
  contract_support_enabled?: boolean // 契約レベルのサポート
}

interface BidData {
  project_id: string
  bid_amount: string
  proposal: string
  budget_approved: boolean
}

function JobsPageContent() {
  const { userProfile, userRole, loading } = useAuth()
  const [jobs, setJobs] = useState<JobData[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobData[]>([])
  const [selectedTab, setSelectedTab] = useState<'available' | 'awarded' | 'all'>('available')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showBidModal, setShowBidModal] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [bidData, setBidData] = useState<BidData>({
    project_id: '',
    bid_amount: '',
    proposal: '',
    budget_approved: false
  })
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<any[]>([])
  const [loadingAttachments, setLoadingAttachments] = useState(false)
  const [previewFile, setPreviewFile] = useState<{ fileId: string; fileName: string } | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const lastFetchKeyRef = useRef<string | null>(null)

  // 予算のフォーマット処理
  const formatBudget = (value: string | number | undefined | null) => {
    // 値が存在しない場合は0を返す
    if (value === null || value === undefined) {
      return '0'
    }
    
    // 文字列に変換
    const stringValue = String(value)
    
    // 数字以外を除去
    const numericValue = stringValue.replace(/[^\d]/g, '')
    
    // 3桁ごとにカンマを追加
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  }

  // 予算の値を数値に変換
  const parseBudget = (value: string | number | undefined | null) => {
    if (value === null || value === undefined) {
      return 0
    }
    
    const stringValue = String(value)
    return parseInt(stringValue.replace(/[^\d]/g, ''), 10) || 0
  }

  // 入札締切日までの残り日数を計算（その日の終わり23:59:59まで有効）
  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    // 締切日の終わり（23:59:59）まで有効とする
    const endOfDeadlineDay = new Date(deadlineDate)
    endOfDeadlineDay.setHours(23, 59, 59, 999)
    
    const diffTime = endOfDeadlineDay.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    // デバッグログ削除
    
    return diffDays
  }

  // 入札締切日の色を決定
  const getDeadlineColor = (deadline: string) => {
    const daysLeft = getDaysUntilDeadline(deadline)
    
    if (daysLeft === null) return 'text-gray-600'
    if (daysLeft <= 0) return 'text-red-600'
    if (daysLeft <= 3) return 'text-orange-600 font-medium'
    return 'text-gray-600'
  }

  // 案件データを取得する関数
  const fetchJobs = async () => {
    try {
      setDataLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.error('fetchJobs: セッションが見つかりません')
        setDataLoading(false)
        // ログインページにリダイレクト
        window.location.href = '/auth/login'
        return
      }

      
      // 受注者向けの案件一覧を取得（入札可能な案件のみ）
      const response = await fetch('/api/jobs', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        setJobs(result.jobs)
        setFilteredJobs(result.jobs)
      } else {
        console.error('fetchJobs: 案件データの取得に失敗:', {
          status: response.status,
          statusText: response.statusText,
          message: result.message
        })
        
        // 認証エラーの場合はログインページにリダイレクト
        if (response.status === 401) {
          window.location.href = '/auth/login'
          return
        }
        
        setJobs([])
        setFilteredJobs([])
      }

    } catch (error) {
      console.error('fetchJobs: データ取得エラー:', error)
      
      // 認証エラーの場合はログインページにリダイレクト
      if (error instanceof Error && error.message.includes('401')) {
        window.location.href = '/auth/login'
        return
      }
      
      setJobs([])
      setFilteredJobs([])
    } finally {
      setDataLoading(false)
    }
  }

  useEffect(() => {
    
    if (!userProfile || userRole !== 'Contractor') {
      setDataLoading(false)
      
      // Contractorロールでない場合はダッシュボードにリダイレクト
      if (userProfile && userRole && userRole !== 'Contractor') {
        alert('このページにアクセスするには受注者権限が必要です')
        window.location.href = '/dashboard'
      }
      return
    }

    // 同一ユーザー・ロールの組み合わせでは1回のみフェッチ（開発時のStrictMode重複実行対策）
    const fetchKey = `${userProfile.id}:${userRole}`
    if (lastFetchKeyRef.current === fetchKey) return
    lastFetchKeyRef.current = fetchKey

    fetchJobs()
  }, [userProfile, userRole])

  // フィルタリング
  useEffect(() => {
    let filtered = jobs

    // ステータスフィルタ
    if (selectedTab === 'available') {
      // 入札可能な案件（入札中 + 優先招待中）
      filtered = filtered.filter(j => j.status === 'bidding' || j.status === 'priority_invitation')
      
      // 期限切れの案件を除外（APIで計算済みのis_expiredフラグを使用）
      filtered = filtered.filter(job => !job.is_expired)
    } else if (selectedTab === 'awarded') {
      // 落札した案件（署名済み契約の案件: APIで status='awarded'）
      filtered = filtered.filter(j => j.status === 'awarded')
    } else if (selectedTab === 'all') {
      // 全ての案件（フィルタリングなし）
      filtered = filtered
    }

    // カテゴリフィルタ
    if (selectedCategory) {
      filtered = filtered.filter(j => j.category === selectedCategory)
    }

    // 検索フィルタ
    if (searchTerm) {
      filtered = filtered.filter(j => 
        j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.org_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        j.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    setFilteredJobs(filtered)
  }, [jobs, selectedTab, selectedCategory, searchTerm])

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!showBidModal) return

    // 募集人数制限をチェック
    const currentJob = jobs.find(j => j.id === showBidModal)
    if (currentJob && !currentJob.can_bid) {
      alert('この案件の募集人数に達しているため、入札できません')
      return
    }

    // バリデーション
    if (!bidData.bid_amount || parseBudget(bidData.bid_amount) <= 0) {
      alert('有効な入札金額を入力してください')
      return
    }

    setIsSubmittingBid(true)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch('/api/bids', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          project_id: showBidModal,
          bid_amount: parseBudget(bidData.bid_amount),
          proposal: bidData.proposal,
          budget_approved: bidData.budget_approved
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('入札が正常に送信されました')
        setShowBidModal(null)
      setBidData({
        project_id: '',
        bid_amount: '',
        proposal: '',
        budget_approved: false
      })
        // 案件一覧を再読み込み
        fetchJobs()
      } else {
        alert('入札の送信に失敗しました: ' + result.message)
      }
    } catch (error) {
      console.error('入札送信エラー:', error)
      alert('ネットワークエラーが発生しました')
    } finally {
      setIsSubmittingBid(false)
    }
  }

  const openBidModal = (jobId: string) => {
    setShowBidModal(jobId)
      setBidData({
        project_id: jobId,
        bid_amount: '',
        proposal: '',
        budget_approved: false
      })
  }

  // 添付資料を取得する関数
  const loadAttachments = async (projectId: string) => {
    setLoadingAttachments(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('セッションが見つかりません')
        return
      }


      const response = await fetch(`/api/contractor/projects/${projectId}/attachments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        setAttachments(result.attachments || [])
      } else {
        console.error('添付資料の取得に失敗:', result.message)
        setAttachments([])
      }
    } catch (error) {
      console.error('添付資料取得エラー:', error)
      setAttachments([])
    } finally {
      setLoadingAttachments(false)
    }
  }

  // ファイルサイズをフォーマットする関数
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // ファイルタイプのアイコンを取得する関数
  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return '📄'
    if (fileType.includes('image')) return '🖼️'
    if (fileType.includes('word')) return '📝'
    if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊'
    if (fileType.includes('powerpoint') || fileType.includes('presentation')) return '📽️'
    if (fileType.includes('zip') || fileType.includes('rar')) return '🗜️'
    if (fileType.includes('text') || fileType.includes('plain')) return '📃'
    // CADファイル形式
    if (fileType.includes('dwg')) return '🏗️'
    if (fileType.includes('step') || fileType.includes('p21')) return '🔧'
    if (fileType.includes('sfc')) return '⚙️'
    if (fileType.includes('bfo')) return '📐'
    return '📎'
  }

  const openJobDetail = (jobId: string) => {
    setShowJobDetail(jobId)
    loadAttachments(jobId)
  }

  // ファイルをダウンロードする関数（認証ヘッダー付き）
  const handleDownload = async (downloadUrl: string, fileName: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        alert('ログインが必要です')
        return
      }

      const response = await fetch(downloadUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        alert('ダウンロードに失敗しました: ' + (error.message || 'Unknown error'))
        return
      }

      // Blobとしてダウンロード
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error('ダウンロードエラー:', error)
      alert('ダウンロード中にエラーが発生しました')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'bidding':
        return 'text-blue-600 bg-blue-100'
      case 'in_progress':
        return 'text-green-600 bg-green-100'
      case 'completed':
        return 'text-gray-600 bg-gray-100'
      case 'cancelled':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'bidding':
        return '入札受付中'
      case 'in_progress':
        return '進行中'
      case 'completed':
        return '完了'
      case 'cancelled':
        return 'キャンセル'
      default:
        return status
    }
  }

  const getCategoryOptions = () => {
    const categories = Array.from(new Set(jobs.map(job => job.category)))
    return categories
  }

  // ローディング状態
  if (loading || dataLoading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? '認証情報を読み込み中...' : '案件データを読み込み中...'}
          </p>
          <div className="mt-4 text-xs text-gray-500">
            <p>Loading: {loading ? 'true' : 'false'}</p>
            <p>DataLoading: {dataLoading ? 'true' : 'false'}</p>
            <p>User: {userProfile ? 'あり' : 'なし'}</p>
            <p>Role: {userRole || 'なし'}</p>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => window.location.reload()} 
              className="text-blue-600 hover:underline text-sm"
            >
              ページを再読み込み
            </button>
          </div>
        </div>
      </div>
    )
  }

  // 権限チェック
  if (userRole !== 'Contractor') {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Building className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
            <p className="text-gray-600">このページは受注者（Contractor）のみアクセス可能です。</p>
            <div className="mt-4 text-xs text-gray-500">
              <p>現在のロール: {userRole || 'なし'}</p>
              <p>ユーザープロフィール: {userProfile ? 'あり' : 'なし'}</p>
            </div>
            <div className="mt-4 space-y-2">
              <a href="/auth/login" className="block text-blue-600 hover:underline">
                ログインページへ
              </a>
              <button 
                onClick={() => window.location.reload()} 
                className="block text-blue-600 hover:underline"
              >
                ページを再読み込み
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navigation />

      <div className="md:ml-64 transition-all duration-300">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-30"
        >
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Hand className="w-6 h-6 text-engineering-blue" />
                  案件一覧
                </h1>
                <p className="text-gray-600">受注可能な案件を検索・入札</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm text-gray-600">入札可能案件</p>
                  <p className="text-sm font-medium">{jobs.filter(j => (j.status === 'bidding' || j.status === 'priority_invitation') && !j.is_expired).length}件</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">落札案件</p>
                  <p className="text-sm font-medium">{jobs.filter(j => j.status === 'awarded').length}件</p>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* フィルターと検索 */}
          <div className="mb-8">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              {/* タブナビゲーション */}
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                {[
                  { 
                    id: 'available', 
                    label: '入札可能', 
                    count: jobs.filter(j => (j.status === 'bidding' || j.status === 'priority_invitation') && !j.is_expired).length 
                  },
                  { 
                    id: 'awarded', 
                    label: '落札案件', 
                    count: jobs.filter(j => j.status !== 'bidding').length 
                  },
                  { id: 'all', label: 'すべて', count: jobs.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedTab === tab.id
                        ? 'bg-white text-engineering-blue shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                    <Badge variant="outline" className="text-xs">
                      {tab.count}
                    </Badge>
                  </button>
                ))}
              </div>

              {/* 検索とフィルター */}
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="案件名・発注者で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent w-64"
                  />
                </div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                >
                  <option value="">すべてのカテゴリ</option>
                  {getCategoryOptions().map((category, index) => (
                    <option key={`${category}-${index}`} value={category}>{category}</option>
                  ))}
                </select>
                <Button variant="outline">
                  <Filter className="w-4 h-4 mr-2" />
                  詳細フィルター
                </Button>
              </div>
            </div>
          </div>

          {/* 案件カード一覧 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <AnimatePresence mode="wait">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={`${job.id}-${selectedTab}-${index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className={`hover-lift cursor-pointer group ${
                    job.is_declined ? 'border-red-200 bg-red-50' :
                    job.is_full ? 'border-orange-200 bg-orange-50' : 
                    job.is_expired ? 'border-gray-200 bg-gray-50' : 
                    'border-gray-200 bg-white'
                  }`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className={`text-lg transition-colors ${
                            job.is_declined ? 'text-red-800' :
                            job.is_full ? 'text-orange-800' : 
                            job.is_expired ? 'text-gray-600' : 
                            'text-gray-900 group-hover:text-engineering-blue'
                          }`}>
                            {job.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {job.org_name} • {job.category}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          {job.status === 'awarded' ? (
                            <Badge className="bg-green-100 text-green-800">
                              落札済み
                            </Badge>
                          ) : (
                            <>
                              {job.status === 'priority_invitation' ? (
                                <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                                  優先招待中
                                </Badge>
                              ) : (
                                <Badge className={getStatusColor(job.status)}>
                                  {getStatusText(job.status)}
                                </Badge>
                              )}
                            </>
                          )}
                          {job.is_declined && (
                            <Badge variant="outline" className="border-red-300 text-red-700 bg-red-100">
                              辞退済み
                            </Badge>
                          )}
                          {job.is_full && !job.is_declined && !job.contract_amount && (
                            <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-100">
                              募集完了
                            </Badge>
                          )}
                          {job.support_enabled && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                              発注者サポート利用
                            </Badge>
                          )}
                          {job.contract_support_enabled && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              受注者サポート利用
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 案件詳細 */}
                      <div className="space-y-2 text-sm">
                        {job.bidding_deadline && job.status !== 'awarded' && (
                          <div className={`flex items-center gap-2 ${getDeadlineColor(job.bidding_deadline)}`}>
                            <Clock className="w-4 h-4" />
                            入札締切: {new Date(job.bidding_deadline).toLocaleDateString('ja-JP')}
                            {(() => {
                              const daysLeft = getDaysUntilDeadline(job.bidding_deadline)
                              if (daysLeft !== null && daysLeft > 0) {
                                return (
                                  <span className="text-xs">
                                    ({daysLeft}日後)
                                  </span>
                                )
                              }
                              return null
                            })()}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {job.contract_amount ? (
                            <span className="text-green-600 font-semibold">
                              {formatBudget(job.contract_amount)} (契約金額)
                            </span>
                          ) : (
                            formatBudget(job.budget)
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          納期: {new Date(job.end_date).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="flex items-center gap-2 text-blue-600">
                          <User className="w-4 h-4" />
                          募集人数: {job.required_contractors}名
                          {job.current_bid_count > 0 && (
                            <span className="text-sm">
                              (入札済み: {job.current_bid_count}名)
                            </span>
                          )}
                        </div>
                        {job.required_level && (
                          <div className="flex items-center gap-2">
                            <Badge className={MEMBER_LEVELS[job.required_level].color}>
                              必要レベル: {MEMBER_LEVELS[job.required_level].label}
                            </Badge>
                          </div>
                        )}
                        {job.is_declined && (
                          <div className="flex items-center gap-2 text-red-600 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            お気に入り会員として優先依頼を辞退しました
                          </div>
                        )}
                        {job.is_full && !job.is_declined && (
                          <div className="flex items-center gap-2 text-red-600 font-medium">
                            <AlertCircle className="w-4 h-4" />
                            募集人数に達しました
                          </div>
                        )}
                        {job.location && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </div>
                        )}
                      </div>

                      {/* 案件説明 */}
                      <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                        <p className="line-clamp-3">{job.description}</p>
                      </div>

                      {/* 発注者情報 */}
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-engineering-blue/10 rounded-full flex items-center justify-center">
                            <Building className="w-4 h-4 text-engineering-blue" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-gray-500">発注者</p>
                            <p className="text-sm font-medium text-gray-900">{job.org_name}</p>
                            {job.assignee_name && (
                              <p className="text-xs text-gray-600">担当: {job.assignee_name}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* アクションボタン */}
                      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                        <div className="text-xs text-gray-500">
                          案件ID: {job.id.slice(0, 8).toUpperCase()}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openJobDetail(job.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {(job.status === 'bidding' || job.status === 'priority_invitation') && (
                            <>
                              {job.is_declined ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled
                                  className="opacity-50 cursor-not-allowed text-red-600 border-red-200"
                                  title="この案件で過去に契約を辞退しているため、再度入札することはできません"
                                >
                                  <X className="w-4 h-4 mr-1" />
                                  辞退済み
                                </Button>
                              ) : (
                                <Button
                                  variant="engineering"
                                  size="sm"
                                  onClick={() => openBidModal(job.id)}
                                  disabled={!job.can_bid}
                                  className={!job.can_bid ? 'opacity-50 cursor-not-allowed' : ''}
                                  title={job.is_full ? '募集人数に達しました' : '入札する'}
                                >
                                  <Hand className="w-4 h-4 mr-1" />
                                  {job.is_full ? '募集終了' : '入札'}
                                </Button>
                              )}
                            </>
                          )}
                          {job.status === 'awarded' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              落札済み
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* アドバイス表示 */}
                      {job.is_declined ? (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <X className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-red-800">
                              この案件で過去に契約を辞退しているため、再度入札することはできません。
                            </p>
                          </div>
                        </div>
                      ) : job.advice ? (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{job.advice}</p>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* 案件がない場合 */}
          {filteredJobs.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Hand className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">案件が見つかりません</h3>
              <p className="text-gray-600 mb-4">
                {searchTerm || selectedCategory ? '検索条件に一致する案件がありません。' : '現在、入札可能な案件はありません。'}
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                  setSelectedTab('all')
                }}
              >
                フィルターをリセット
              </Button>
            </motion.div>
          )}
        </main>
      </div>

      {/* 入札モーダル */}
      <AnimatePresence>
        {showBidModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Hand className="w-5 h-5 text-engineering-blue" />
                    入札フォーム
                  </CardTitle>
                  <CardDescription>
                    {(() => {
                      const job = jobs.find(j => j.id === showBidModal)
                      return job ? `${job.title} への入札` : '入札フォーム'
                    })()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
        <form onSubmit={handleBidSubmit} className="space-y-4">
          {/* 募集状況表示 */}
          {(() => {
            const job = jobs.find(j => j.id === showBidModal)
            if (job && job.is_declined) {
              return (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <X className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">入札不可</span>
                  </div>
                  <div className="text-sm text-red-700">
                    この案件で過去に契約を辞退しているため、再度入札することはできません。
                  </div>
                </div>
              )
            }
            if (job && job.is_full) {
              return (
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">募集終了</span>
                  </div>
                  <div className="text-sm text-red-700">
                    この案件の募集人数（{job.required_contractors}名）に達しているため、入札できません。
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* 発注者側の予算表示 */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-900">発注者側の予算</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              {(() => {
                const job = jobs.find(j => j.id === showBidModal)
                return job ? formatBudget(job.budget) + '円' : '読み込み中...'
              })()}
            </div>
          </div>

                    {/* 予算承認チェック */}
                    <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        id="budget_approved"
                        checked={bidData.budget_approved}
                        onChange={(e) => {
                          const isApproved = e.target.checked
                          const currentJob = jobs.find(j => j.id === showBidModal)
                          
                          setBidData({ 
                            ...bidData, 
                            budget_approved: isApproved,
                            bid_amount: isApproved ? formatBudget(currentJob?.budget || 0) : bidData.bid_amount
                          })
                        }}
                        className="w-4 h-4 text-engineering-blue border-gray-300 rounded focus:ring-engineering-blue"
                      />
                      <label htmlFor="budget_approved" className="text-sm font-medium text-gray-700">
                        上記の予算で問題ありません
                      </label>
                    </div>

                    {/* 入札金額 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        入札金額 * (円)
                      </label>
                      <input
                        type="text"
                        value={bidData.budget_approved ? formatBudget(jobs.find(j => j.id === showBidModal)?.budget || 0) : bidData.bid_amount}
                        onChange={(e) => {
                          if (!bidData.budget_approved) {
                            const formatted = formatBudget(e.target.value)
                            setBidData({ ...bidData, bid_amount: formatted })
                          }
                        }}
                        placeholder="例: 500,000"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent ${
                          bidData.budget_approved 
                            ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed' 
                            : 'border-gray-200'
                        }`}
                        disabled={bidData.budget_approved}
                        required
                      />
                      {bidData.budget_approved && (
                        <p className="mt-1 text-sm text-gray-500">
                          予算承認済みのため、発注者側の予算と同じ金額で入札されます
                        </p>
                      )}
                    </div>

                    {/* コメント */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        コメント
                      </label>
                      <textarea
                        value={bidData.proposal}
                        onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                        rows={4}
                        placeholder="案件に対する提案やアプローチ方法を記入してください（任意）..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBidModal(null)}
                        disabled={isSubmittingBid}
                      >
                        キャンセル
                      </Button>
                      <Button 
                        type="submit" 
                        variant="engineering"
                        disabled={isSubmittingBid || (() => {
                          const job = jobs.find(j => j.id === showBidModal)
                          return job ? (!job.can_bid || job.is_declined) : false
                        })()}
                      >
                        {(() => {
                          const job = jobs.find(j => j.id === showBidModal)
                          if (job && job.is_declined) return '入札不可'
                          if (job && !job.can_bid) return '募集終了'
                          if (isSubmittingBid) return '送信中...'
                          return '入札を送信'
                        })()}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 案件詳細モーダル */}
      <AnimatePresence>
        {showJobDetail && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-engineering-blue" />
                        案件詳細
                      </CardTitle>
                      <CardDescription>
                        {jobs.find(j => j.id === showJobDetail)?.title}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowJobDetail(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const job = jobs.find(j => j.id === showJobDetail)
                    if (!job) return null

                    return (
                      <div className="space-y-6">
                        {/* 基本情報 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">基本情報</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">案件名:</span>
                                <span className="font-medium">{job.title}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">カテゴリ:</span>
                                <span className="font-medium">{job.category}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">{job.contract_amount ? '契約金額:' : '予算:'}</span>
                                <span className="font-medium text-engineering-blue">
                                  {job.contract_amount ? formatCurrency(job.contract_amount) : formatCurrency(job.budget)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">納期:</span>
                                <span className="font-medium">{new Date(job.end_date).toLocaleDateString('ja-JP')}</span>
                              </div>
                              {job.bidding_deadline && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">入札締切:</span>
                                  <span className={`font-medium ${getDeadlineColor(job.bidding_deadline)}`}>
                                    {new Date(job.bidding_deadline).toLocaleDateString('ja-JP')}
                                    {(() => {
                                      const daysLeft = getDaysUntilDeadline(job.bidding_deadline)
                                      if (daysLeft !== null && daysLeft > 0) {
                                        return (
                                          <span className="text-xs ml-1">
                                            ({daysLeft}日後)
                                          </span>
                                        )
                                      }
                                      return null
                                    })()}
                                  </span>
                                </div>
                              )}
                              {job.location && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">場所:</span>
                                  <span className="font-medium">{job.location}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">発注者情報</h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">発注者:</span>
                                <span className="font-medium">{job.org_name}</span>
                              </div>
                              {job.assignee_name && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">担当者:</span>
                                  <span className="font-medium">{job.assignee_name}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-gray-600">案件ID:</span>
                                <span className="font-mono text-xs">{job.id}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* 案件説明 */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">案件説明</h3>
                          <div className="bg-gray-50 p-4 rounded-lg">
                            <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.description}</p>
                          </div>
                        </div>

                        {/* 要件 */}
                        {job.requirements && (
                          <div>
                            <h3 className="font-semibold text-gray-900 mb-3">要件・条件</h3>
                            <div className="bg-blue-50 p-4 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{job.requirements}</p>
                            </div>
                          </div>
                        )}

                        {/* 添付資料 */}
                        <div>
                          <h3 className="font-semibold text-gray-900 mb-3">添付資料</h3>
                          {loadingAttachments ? (
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                              <div className="text-sm text-gray-600">添付資料を読み込み中...</div>
                            </div>
                          ) : attachments.length > 0 ? (
                            <div className="space-y-2">
                              {attachments.map((attachment, index) => (
                                <div key={`${attachment.id}-${index}`} className="bg-gray-50 p-3 rounded-lg border">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className="text-lg">{getFileIcon(attachment.file_type)}</span>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">
                                          {attachment.file_name}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {formatFileSize(attachment.file_size)} • 
                                          {new Date(attachment.created_at).toLocaleDateString('ja-JP')} • 
                                          {attachment.uploaded_by_name}
                                        </div>
                                      </div>
                                    </div>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setPreviewFile({
                                          fileId: attachment.file_path,
                                          fileName: attachment.file_name
                                        })
                                        setIsPreviewOpen(true)
                                      }}
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      プレビュー
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="bg-gray-50 p-4 rounded-lg text-center">
                              <div className="text-sm text-gray-600">添付資料はありません</div>
                            </div>
                          )}
                        </div>

                        {/* アクションボタン */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                          <Button
                            variant="outline"
                            onClick={() => setShowJobDetail(null)}
                          >
                            閉じる
                          </Button>
                          {job.status === 'bidding' && (
                            <Button
                              variant="engineering"
                              onClick={() => {
                                setShowJobDetail(null)
                                openBidModal(job.id)
                              }}
                              disabled={!job.can_bid}
                              className={!job.can_bid ? 'opacity-50 cursor-not-allowed' : ''}
                            >
                              <Hand className="w-4 h-4 mr-2" />
                              {job.is_full ? '募集人数に達しました' : '入札する'}
                            </Button>
                          )}
                          {job.status !== 'bidding' && (
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              落札済み
                            </Badge>
                          )}
                        </div>
                      </div>
                    )
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ファイルプレビューモーダル */}
      {previewFile && (
        <FilePreviewModal
          fileId={previewFile.fileId}
          fileName={previewFile.fileName}
          isOpen={isPreviewOpen}
          onClose={() => {
            setIsPreviewOpen(false)
            setPreviewFile(null)
          }}
        />
      )}
    </div>
  )
}

export default function JobsPage() {
  return (
    <AuthGuard requiredRole="Contractor">
      <JobsPageContent />
    </AuthGuard>
  )
}
