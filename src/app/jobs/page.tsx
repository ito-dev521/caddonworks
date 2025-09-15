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
import { formatCurrency } from "@/lib/utils"
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
}

interface BidData {
  project_id: string
  bid_amount: number
  proposal: string
  estimated_duration: number
  start_date: string
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
    bid_amount: 0,
    proposal: '',
    estimated_duration: 0,
    start_date: ''
  })
  const [isSubmittingBid, setIsSubmittingBid] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState<string | null>(null)

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
        return
      }

      console.log('fetchJobs: APIリクエスト開始')
      // 受注者向けの案件一覧を取得（入札可能な案件のみ）
      const response = await fetch('/api/jobs', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
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
        console.error('fetchJobs: 案件データの取得に失敗:', result.message)
        setJobs([])
        setFilteredJobs([])
      }

    } catch (error) {
      console.error('fetchJobs: データ取得エラー:', error)
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
      loading: loading
    })
    
    if (!userProfile || userRole !== 'Contractor') {
      console.log('useEffect: 認証条件未満のため、データ取得をスキップ')
      setDataLoading(false)
      return
    }

    console.log('useEffect: 認証OK、データ取得開始')
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
          ...bidData,
          project_id: showBidModal
        })
      })

      const result = await response.json()

      if (response.ok) {
        alert('入札が正常に送信されました')
        setShowBidModal(null)
        setBidData({
          project_id: '',
          bid_amount: 0,
          proposal: '',
          estimated_duration: 0,
          start_date: ''
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
      bid_amount: 0,
      proposal: '',
      estimated_duration: 0,
      start_date: ''
    })
  }

  const openJobDetail = (jobId: string) => {
    setShowJobDetail(jobId)
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
          <p className="text-gray-600">案件データを読み込み中...</p>
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
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4" />
                          納期: {new Date(job.end_date).toLocaleDateString('ja-JP')}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="w-4 h-4" />
                          {formatCurrency(job.budget)}
                        </div>
                        {job.location && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <MapPin className="w-4 h-4" />
                            {job.location}
                          </div>
                        )}
                        {job.bidding_deadline && (
                          <div className="flex items-center gap-2 text-orange-600">
                            <Clock className="w-4 h-4" />
                            入札締切: {new Date(job.bidding_deadline).toLocaleDateString('ja-JP')}
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
                            >
                              <Hand className="w-4 h-4 mr-1" />
                              入札
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
                    {jobs.find(j => j.id === showBidModal)?.title} への入札
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleBidSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          入札金額 *
                        </label>
                        <input
                          type="number"
                          value={bidData.bid_amount}
                          onChange={(e) => setBidData({ ...bidData, bid_amount: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          想定期間（日数） *
                        </label>
                        <input
                          type="number"
                          value={bidData.estimated_duration}
                          onChange={(e) => setBidData({ ...bidData, estimated_duration: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        開始予定日 *
                      </label>
                      <input
                        type="date"
                        value={bidData.start_date}
                        onChange={(e) => setBidData({ ...bidData, start_date: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        提案内容 *
                      </label>
                      <textarea
                        value={bidData.proposal}
                        onChange={(e) => setBidData({ ...bidData, proposal: e.target.value })}
                        rows={4}
                        placeholder="案件に対する提案やアプローチ方法を記入してください..."
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                        required
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
                        disabled={isSubmittingBid}
                      >
                        {isSubmittingBid ? '送信中...' : '入札を送信'}
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
                            >
                              <Hand className="w-4 h-4 mr-2" />
                              入札する
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
