"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Star, Calendar, MessageSquare, User } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Navigation } from "@/components/layouts/navigation"
import { useAuth } from "@/contexts/auth-context"
import { supabase } from "@/lib/supabase"

interface Evaluation {
  id: string
  project_id: string
  contractor_id: string
  evaluator_id: string
  deadline_score: number
  quality_score: number
  communication_score: number
  understanding_score: number
  professionalism_score: number
  average_score: number
  comment: string | null
  created_at: string
  projects: {
    title: string
  }
  evaluator: {
    display_name: string
  }
}

export default function EvaluationsPage() {
  return (
    <AuthGuard requiredRole="Contractor">
      <EvaluationsPageContent />
    </AuthGuard>
  )
}

function EvaluationsPageContent() {
  const { userProfile, userRole } = useAuth()
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 評価データを取得
  const fetchEvaluations = async () => {
    if (!userProfile || userRole !== 'Contractor') return

    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const response = await fetch(`/api/evaluations/contractor?contractor_id=${userProfile.id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (response.ok) {
        const result = await response.json()
        setEvaluations(result.evaluations || [])
      } else {
        setError('評価データの取得に失敗しました')
      }
    } catch (error) {
      console.error('評価取得エラー:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvaluations()
  }, [userProfile, userRole])

  const StarRating = ({ score }: { score: number }) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`w-4 h-4 ${
            star <= score
              ? 'text-yellow-400 fill-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-2 text-sm text-gray-600">{score.toFixed(1)}</span>
    </div>
  )

  const getScoreLabel = (score: number) => {
    if (score >= 4.5) return { label: '優秀', color: 'bg-green-100 text-green-800' }
    if (score >= 3.5) return { label: '良好', color: 'bg-blue-100 text-blue-800' }
    if (score >= 2.5) return { label: '普通', color: 'bg-yellow-100 text-yellow-800' }
    if (score >= 1.5) return { label: '要改善', color: 'bg-orange-100 text-orange-800' }
    return { label: '不十分', color: 'bg-red-100 text-red-800' }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navigation />
        <div className="md:ml-64 transition-all duration-300">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
              <p className="text-gray-600">評価データを読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navigation />
        <div className="md:ml-64 transition-all duration-300">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="text-red-500 text-xl mb-4">⚠️</div>
              <p className="text-gray-600">{error}</p>
              <button
                onClick={fetchEvaluations}
                className="mt-4 px-4 py-2 bg-engineering-blue text-white rounded-lg hover:bg-blue-700"
              >
                再試行
              </button>
            </div>
          </div>
        </div>
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
                  <Star className="w-6 h-6 text-yellow-500" />
                  受注者評価
                </h1>
                <p className="text-gray-600">発注者からの評価とコメントを確認できます</p>
              </div>
              <Badge variant="engineering">
                {evaluations.length}件の評価
              </Badge>
            </div>
          </div>
        </motion.header>

        <main className="px-6 py-8">
          {evaluations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">まだ評価がありません</h2>
              <p className="text-gray-600">
                案件完了後に発注者からの評価が表示されます
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              {evaluations.map((evaluation, index) => {
                const scoreInfo = getScoreLabel(evaluation.average_score)
                return (
                  <motion.div
                    key={evaluation.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div>
                            <CardTitle className="text-lg font-semibold text-gray-900 mb-2">
                              {evaluation.projects.title}
                            </CardTitle>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(evaluation.created_at).toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 mb-2">
                              <StarRating score={evaluation.average_score} />
                            </div>
                            <Badge className={scoreInfo.color}>
                              {scoreInfo.label}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {/* 詳細評価 */}
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">納期</div>
                              <StarRating score={evaluation.deadline_score} />
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">成果品の質</div>
                              <StarRating score={evaluation.quality_score} />
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">コミュニケーション</div>
                              <StarRating score={evaluation.communication_score} />
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">理解度</div>
                              <StarRating score={evaluation.understanding_score} />
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">プロフェッショナリズム</div>
                              <StarRating score={evaluation.professionalism_score} />
                            </div>
                          </div>

                          {/* コメント */}
                          {evaluation.comment && (
                            <div className="border-t pt-4">
                              <div className="flex items-center gap-2 mb-2">
                                <MessageSquare className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium text-gray-700">コメント</span>
                              </div>
                              <div className="bg-blue-50 p-4 rounded-lg">
                                <p className="text-gray-700 italic">
                                  "{evaluation.comment}"
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
