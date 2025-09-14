"use client"

import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Star,
  Award,
  TrendingUp,
  Users,
  FileCheck,
  Clock,
  Target,
  MessageSquare,
  Filter,
  Search,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit,
  Plus
} from "lucide-react"
import { Navigation } from "@/components/layouts/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { MetricCard } from "@/components/ui/metric-card"
import { ReviewCard } from "@/components/reviews/review-card"
// import { ReviewModal } from "@/components/reviews/review-modal"
// import { PerformanceChart } from "@/components/reviews/performance-chart"

export default function ReviewsPage() {
  const [selectedTab, setSelectedTab] = useState<'pending' | 'completed' | 'analytics'>('pending')
  const [showReviewModal, setShowReviewModal] = useState<string | null>(null)

  // Mock review data
  const pendingReviews = [
    {
      id: "1",
      project: {
        id: "proj1",
        title: "東京都道路設計業務",
        contractor: "田中太郎",
        contractorId: "user1",
        completedDate: "2024-01-15",
        budget: 5200000,
        category: "道路設計"
      },
      status: "pending",
      dueDate: "2024-01-25",
      urgency: "high"
    },
    {
      id: "2",
      project: {
        id: "proj2",
        title: "橋梁点検業務",
        contractor: "佐藤花子",
        contractorId: "user2",
        completedDate: "2024-01-10",
        budget: 3800000,
        category: "構造物点検"
      },
      status: "pending",
      dueDate: "2024-01-20",
      urgency: "medium"
    }
  ]

  const completedReviews = [
    {
      id: "3",
      project: {
        id: "proj3",
        title: "河川改修設計",
        contractor: "山田次郎",
        contractorId: "user3",
        completedDate: "2023-12-20",
        budget: 7500000,
        category: "河川工事"
      },
      reviewer: "監督員A",
      reviewDate: "2024-01-05",
      scores: {
        quality: 4.5,
        compliance: 5.0,
        quantity_integrity: 4.2,
        schedule: 4.8,
        communication: 4.0,
        rework_rate: 4.5
      },
      overallScore: 4.5,
      comment: "高品質な成果物でした。特に設計図面の精度が素晴らしく、施工への移行がスムーズに行えると思います。",
      status: "completed"
    },
    {
      id: "4",
      project: {
        id: "proj4",
        title: "地下構造物設計",
        contractor: "中村健太",
        contractorId: "user4",
        completedDate: "2023-12-15",
        budget: 8900000,
        category: "地下構造"
      },
      reviewer: "監督員B",
      reviewDate: "2023-12-28",
      scores: {
        quality: 3.8,
        compliance: 4.2,
        quantity_integrity: 3.5,
        schedule: 3.0,
        communication: 4.5,
        rework_rate: 3.2
      },
      overallScore: 3.7,
      comment: "全体的に良好でしたが、納期管理に課題があります。次回プロジェクトでは改善を期待します。",
      status: "completed"
    }
  ]

  const reviewMetrics = {
    totalReviews: 48,
    pendingReviews: pendingReviews.length,
    averageScore: 4.2,
    completionRate: 95.8,
    topPerformers: [
      { name: "田中太郎", score: 4.8, projects: 12 },
      { name: "佐藤花子", score: 4.6, projects: 8 },
      { name: "山田次郎", score: 4.5, projects: 10 }
    ]
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return 'text-red-600 bg-red-100'
      case 'medium':
        return 'text-orange-600 bg-orange-100'
      case 'low':
        return 'text-green-600 bg-green-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600'
    if (score >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
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
                  <Award className="w-6 h-6 text-engineering-blue" />
                  評価・レビューシステム
                </h1>
                <p className="text-gray-600">土木業務特化の品質評価と相互レビュー</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="engineering" className="animate-pulse">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  評価対象: {pendingReviews.length}件
                </Badge>
                <Button variant="engineering">
                  <Plus className="w-4 h-4 mr-2" />
                  新規評価
                </Button>
              </div>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {/* Overview Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <MetricCard
              title="総評価数"
              value={reviewMetrics.totalReviews}
              icon={<Award className="w-6 h-6" />}
              trend={{ value: 12, isPositive: true }}
              variant="engineering"
            />
            <MetricCard
              title="未評価"
              value={reviewMetrics.pendingReviews}
              icon={<Clock className="w-6 h-6" />}
              trend={{ value: 3, isPositive: false }}
              variant="gradient"
            />
            <MetricCard
              title="平均スコア"
              value={`${reviewMetrics.averageScore}/5.0`}
              icon={<Star className="w-6 h-6" />}
              trend={{ value: 5, isPositive: true }}
              variant="default"
            />
            <MetricCard
              title="完了率"
              value={`${reviewMetrics.completionRate}%`}
              icon={<Target className="w-6 h-6" />}
              trend={{ value: 2, isPositive: true }}
              variant="glass"
            />
          </div>

          {/* Tab Navigation */}
          <div className="mb-8">
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8">
                {[
                  { id: 'pending', label: '評価待ち', count: pendingReviews.length, icon: Clock },
                  { id: 'completed', label: '完了済み', count: completedReviews.length, icon: CheckCircle },
                  { id: 'analytics', label: 'パフォーマンス分析', icon: BarChart3 }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedTab(tab.id as any)}
                    className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                      selectedTab === tab.id
                        ? 'border-engineering-blue text-engineering-blue'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {tab.count !== undefined && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        {tab.count}
                      </Badge>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            {/* Pending Reviews */}
            {selectedTab === 'pending' && (
              <motion.div
                key="pending"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">評価待ち案件</h2>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        placeholder="案件・受注者で検索..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                      />
                    </div>
                    <Button variant="outline">
                      <Filter className="w-4 h-4 mr-2" />
                      フィルター
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {pendingReviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="hover-lift">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg text-gray-900">
                                {review.project.title}
                              </CardTitle>
                              <CardDescription>
                                {review.project.contractor} • {review.project.category}
                              </CardDescription>
                            </div>
                            <Badge className={getUrgencyColor(review.urgency)}>
                              {review.urgency === 'high' && '🔥 '}
                              {review.urgency.toUpperCase()}
                            </Badge>
                          </div>
                        </CardHeader>

                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">完了日:</span>
                              <div className="font-medium">
                                {new Date(review.project.completedDate).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">評価期限:</span>
                              <div className="font-medium text-orange-600">
                                {new Date(review.dueDate).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">予算:</span>
                              <div className="font-medium text-engineering-blue">
                                {formatCurrency(review.project.budget)}
                              </div>
                            </div>
                            <div>
                              <span className="text-gray-600">期限まで:</span>
                              <div className="font-medium">
                                {Math.ceil((new Date(review.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}日
                              </div>
                            </div>
                          </div>

                          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                            <div className="text-xs text-gray-500">
                              案件ID: {review.project.id.toUpperCase()}
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="engineering"
                                size="sm"
                                onClick={() => setShowReviewModal(review.id)}
                              >
                                <Edit className="w-4 h-4 mr-2" />
                                評価開始
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Completed Reviews */}
            {selectedTab === 'completed' && (
              <motion.div
                key="completed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">完了済み評価</h2>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      レポート出力
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  {completedReviews.map((review, index) => (
                    <ReviewCard key={review.id} review={review} index={index} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Analytics */}
            {selectedTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <h2 className="text-xl font-semibold text-gray-900">パフォーマンス分析</h2>

                {/* Performance Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>パフォーマンス分析</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600">パフォーマンス分析チャートは準備中です。</p>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                        トップパフォーマー
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {reviewMetrics.topPerformers.map((performer, index) => (
                          <motion.div
                            key={performer.name}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-engineering-blue text-white rounded-full flex items-center justify-center text-sm font-bold">
                                {index + 1}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{performer.name}</div>
                                <div className="text-sm text-gray-600">{performer.projects}件完了</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                              <span className={`font-bold ${getScoreColor(performer.score)}`}>
                                {performer.score}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-engineering-blue" />
                        評価項目別平均
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          { label: '品質', value: 4.3, category: 'quality' },
                          { label: '基準適合', value: 4.5, category: 'compliance' },
                          { label: '数量整合', value: 4.1, category: 'quantity' },
                          { label: '納期', value: 3.9, category: 'schedule' },
                          { label: 'コミュニケーション', value: 4.2, category: 'communication' },
                          { label: '手戻り率', value: 4.0, category: 'rework' }
                        ].map((item, index) => (
                          <motion.div
                            key={item.category}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="space-y-2"
                          >
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium text-gray-700">{item.label}</span>
                              <span className={`font-bold ${getScoreColor(item.value)}`}>
                                {item.value}/5.0
                              </span>
                            </div>
                            <Progress value={item.value * 20} variant="engineering" />
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl mx-4">
            <CardHeader>
              <CardTitle>評価モーダル</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">評価モーダルは準備中です。</p>
              <div className="mt-4 flex justify-end">
                <Button onClick={() => setShowReviewModal(null)}>
                  閉じる
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}