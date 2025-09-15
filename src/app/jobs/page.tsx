"use client"

import React, { useEffect, useState, useCallback } from "react"
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
  can_bid: boolean
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
  const [selectedTab, setSelectedTab] = useState<'available' | 'bidding' | 'all'>('available')
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

  // 入札締切日までの残り日数を計算
  const getDaysUntilDeadline = (deadline: string) => {
    if (!deadline) return null
    
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
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
  const fetchJobs = useCallback(async () => {
    try {
      console.log('fetchJobs: 開始')
      setDataLoading(true)
      
      const { data: { session } } = await supabase.auth.getSession()
      console.log('fetchJobs: セッション確認', session ? 'あり' : 'なし')
      
      if (!session) {
        console.error('fetchJobs: セッションが見つかりません')
        setDataLoading(false)
        // ログインページにリダイレクト
        window.location.href = '/auth/login'
        return
      }

      console.log('fetchJobs: APIリクエスト開始', {
        hasAccessToken: !!session.access_token,
        tokenLength: session.access_token?.length,
        tokenPreview: session.access_token?.substring(0, 20) + '...'
      })
      
      // 受注者向けの案件一覧を取得（入札可能な案件のみ）
      const response = await fetch('/api/jobs', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('fetchJobs: APIレスポンス', response.status, response.statusText)
      const result = await response.json()
      console.log('fetchJobs: API結果', result)

      if (response.ok) {
        console.log('fetchJobs: 成功, 案件数:', result.jobs?.length || 0)
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
          console.log('fetchJobs: 認証エラー、ログインページにリダイレクト')
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
        console.log('fetchJobs: 認証エラー、ログインページにリダイレクト')
        window.location.href = '/auth/login'
        return
      }
      
      setJobs([])
      setFilteredJobs([])
    } finally {
      console.log('fetchJobs: 終了')
      setDataLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('useEffect: 認証状態確認', {
      userProfile: userProfile ? 'あり' : 'なし',
      userRole: userRole,
      loading: loading,
      userProfileId: userProfile?.id,
      userEmail: userProfile?.email
    })
    
    if (!userProfile || userRole !== 'Contractor') {
      console.log('useEffect: 認証条件未満のため、データ取得をスキップ', {
        hasUserProfile: !!userProfile,
        userRole: userRole,
        expectedRole: 'Contractor'
      })
      setDataLoading(false)
      
      // Contractorロールでない場合はダッシュボードにリダイレクト
      if (userProfile && userRole && userRole !== 'Contractor') {
        console.log('useEffect: 権限不足でリダイレクト', { userRole })
        alert('このページにアクセスするには受注者権限が必要です')
        window.location.href = '/dashboard'
      }
      return
    }

    console.log('useEffect: 認証OK、データ取得開始', { userRole, userProfileId: userProfile.id })
    fetchJobs()
  }, [userProfile, userRole, fetchJobs])

  // フィルタリング
  useEffect(() => {
    let filtered = jobs

    // ステータスフィルタ
    if (selectedTab === 'available') {
      filtered = filtered.filter(j => j.status === 'bidding')
    } else if (selectedTab === 'bidding') {
      // 入札済み案件（実装は後で追加）
      filtered = []
    }

    // 入札締切日フィルタ（締切切れの案件を除外）
    const now = new Date()
    filtered = filtered.filter(job => {
      if (!job.bidding_deadline) return true // 締切日が設定されていない場合は表示
      
      const deadline = new Date(job.bidding_deadline)
      return deadline > now // 締切日が現在時刻より後のみ表示
    })

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
    if (!bidData.budget_approved) {
      alert('発注者側の予算に同意してください')
      return
    }
    
    // 予算承認済みでない場合は入札金額をチェック
    if (!bidData.budget_approved && (!bidData.bid_amount || parseBudget(bidData.bid_amount) <= 0)) {
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
          bid_amount: bidData.budget_approved 
            ? parseBudget(formatBudget(jobs.find(j => j.id === showBidModal)?.budget || 0))
            : parseBudget(bidData.bid_amount),
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
    return '📎'
  }

  const openJobDetail = (jobId: string) => {
    setShowJobDetail(jobId)
    loadAttachments(jobId)
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
    const categories = [...new Set(jobs.map(job => job.category))]
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
    console.log('JobsPage: 権限チェック失敗', { userRole, userProfile: !!userProfile })
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
                  <p className="text-sm font-medium">{jobs.filter(j => j.status === 'bidding').length}件</p>
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
                  { id: 'available', label: '入札可能', count: jobs.filter(j => j.status === 'bidding').length },
                  { id: 'bidding', label: '入札済み', count: 0 }, // 実装は後で追加
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
                  {getCategoryOptions().map(category => (
                    <option key={category} value={category}>{category}</option>
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
            <AnimatePresence>
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="hover-lift cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-gray-900 group-hover:text-engineering-blue transition-colors">
                            {job.title}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {job.org_name} • {job.category}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(job.status)}>
                          {getStatusText(job.status)}
                        </Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* 案件詳細 */}
                      <div className="space-y-2 text-sm">
                        {job.bidding_deadline && (
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
                          {formatBudget(job.budget)}
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
                        {job.is_full && (
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
                          {job.status === 'bidding' && (
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
                        </div>
                      </div>
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
                          return job ? !job.can_bid : false
                        })()}
                      >
                        {(() => {
                          const job = jobs.find(j => j.id === showBidModal)
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
                                <span className="text-gray-600">予算:</span>
                                <span className="font-medium text-engineering-blue">{formatCurrency(job.budget)}</span>
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
                              {attachments.map((attachment) => (
                                <div key={attachment.id} className="bg-gray-50 p-3 rounded-lg border">
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
                                      onClick={() => window.open(attachment.download_url, '_blank')}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      ダウンロード
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
