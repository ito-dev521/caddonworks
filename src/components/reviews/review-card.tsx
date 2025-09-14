"use client"

import React from "react"
import { motion } from "framer-motion"
import {
  Star,
  Calendar,
  User,
  MessageSquare,
  Award,
  TrendingUp,
  TrendingDown,
  Eye,
  Download,
  BarChart3
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { Button } from "../ui/button"
import { Progress } from "../ui/progress"

interface ReviewCardProps {
  review: {
    id: string
    project: {
      id: string
      title: string
      contractor: string
      contractorId: string
      completedDate: string
      budget: number
      category: string
    }
    reviewer: string
    reviewDate: string
    scores: {
      quality: number
      compliance: number
      quantity_integrity: number
      schedule: number
      communication: number
      rework_rate: number
    }
    overallScore: number
    comment: string
    status: string
  }
  index?: number
}

export function ReviewCard({ review, index = 0 }: ReviewCardProps) {
  const scoreCategories = [
    { key: 'quality', label: '品質', icon: Award },
    { key: 'compliance', label: '基準適合', icon: Star },
    { key: 'quantity_integrity', label: '数量整合', icon: BarChart3 },
    { key: 'schedule', label: '納期', icon: Calendar },
    { key: 'communication', label: 'コミュニケーション', icon: MessageSquare },
    { key: 'rework_rate', label: '手戻り率', icon: TrendingUp }
  ]

  const getScoreColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600'
    if (score >= 3.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBadgeVariant = (score: number) => {
    if (score >= 4.5) return 'success'
    if (score >= 3.5) return 'warning'
    return 'destructive'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
    }).format(amount)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="hover-lift">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg text-gray-900 mb-1">
                {review.project.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span>{review.project.contractor}</span>
                <span>•</span>
                <span>{review.project.category}</span>
                <span>•</span>
                <span className="font-semibold text-engineering-blue">
                  {formatCurrency(review.project.budget)}
                </span>
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-500 fill-current" />
                <span className={`text-2xl font-bold ${getScoreColor(review.overallScore)}`}>
                  {review.overallScore}
                </span>
                <span className="text-gray-500">/5.0</span>
              </div>
              <Badge variant={getScoreBadgeVariant(review.overallScore) as any}>
                {review.overallScore >= 4.5 ? '優秀' : review.overallScore >= 3.5 ? '良好' : '要改善'}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Score Breakdown */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              詳細評価
            </h4>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              {scoreCategories.map((category) => {
                const score = review.scores[category.key as keyof typeof review.scores]
                const IconComponent = category.icon
                return (
                  <motion.div
                    key={category.key}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300, damping: 10 }}
                  >
                    <div className="p-2 bg-white rounded-lg shadow-sm">
                      <IconComponent className="w-4 h-4 text-engineering-blue" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-700">{category.label}</div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-bold ${getScoreColor(score)}`}>
                          {score}
                        </span>
                        <Progress value={score * 20} variant="engineering" className="flex-1 h-1" />
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>

          {/* Comment */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              評価コメント
            </h4>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-gray-700 leading-relaxed">{review.comment}</p>
            </div>
          </div>

          {/* Review Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                <User className="w-4 h-4" />
                評価者
              </div>
              <div className="font-semibold text-gray-900">{review.reviewer}</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                評価日
              </div>
              <div className="font-semibold text-gray-900">
                {new Date(review.reviewDate).toLocaleDateString('ja-JP')}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-1">
                <Calendar className="w-4 h-4" />
                完了日
              </div>
              <div className="font-semibold text-gray-900">
                {new Date(review.project.completedDate).toLocaleDateString('ja-JP')}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              案件ID: {review.project.id.toUpperCase()}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-2" />
                詳細表示
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                レポート
              </Button>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-gradient-engineering-subtle rounded-lg">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                {review.overallScore > 4.0 ? (
                  <TrendingUp className="w-4 h-4 text-green-600" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-red-600" />
                )}
                <span className="text-xs text-gray-600">パフォーマンス</span>
              </div>
              <div className={`text-sm font-bold ${getScoreColor(review.overallScore)}`}>
                {review.overallScore > 4.0 ? '向上' : '要注意'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">手戻り</div>
              <div className={`text-sm font-bold ${getScoreColor(review.scores.rework_rate)}`}>
                {review.scores.rework_rate >= 4.0 ? '低' : '高'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 mb-1">推奨度</div>
              <div className={`text-sm font-bold ${getScoreColor(review.overallScore)}`}>
                {review.overallScore >= 4.5 ? '強く推奨' : review.overallScore >= 3.5 ? '推奨' : '条件付き'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}