'use client'

import { Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ContractorRatingDisplayProps {
  evaluations: any[]
  loading: boolean
}

export function ContractorRatingDisplay({ evaluations, loading }: ContractorRatingDisplayProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            受注者評価
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">評価データを読み込み中...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!evaluations || evaluations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            受注者評価
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">まだ評価がありません</p>
            <p className="text-sm text-gray-500 mt-2">
              案件完了後に発注者からの評価が表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // 平均評価を計算
  const totalEvaluations = evaluations.length
  const averageRating = evaluations.reduce((sum, evaluation) => sum + evaluation.average_score, 0) / totalEvaluations
  const avgDeadline = evaluations.reduce((sum, evaluation) => sum + evaluation.deadline_score, 0) / totalEvaluations
  const avgQuality = evaluations.reduce((sum, evaluation) => sum + evaluation.quality_score, 0) / totalEvaluations
  const avgCommunication = evaluations.reduce((sum, evaluation) => sum + evaluation.communication_score, 0) / totalEvaluations
  const avgUnderstanding = evaluations.reduce((sum, evaluation) => sum + evaluation.understanding_score, 0) / totalEvaluations
  const avgProfessionalism = evaluations.reduce((sum, evaluation) => sum + evaluation.professionalism_score, 0) / totalEvaluations

  const StarRating = ({ score, label }: { score: number, label: string }) => (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <div className="flex items-center gap-1">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(score)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-gray-600 ml-2">
          {score.toFixed(1)}
        </span>
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" />
          受注者評価
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 総合評価 */}
        <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
            <span className="text-2xl font-bold text-gray-900">
              {averageRating.toFixed(1)}
            </span>
            <span className="text-gray-600">/ 5.0</span>
          </div>
          <p className="text-sm text-gray-600">
            {totalEvaluations}件の評価
          </p>
          <Badge variant="secondary" className="mt-2">
            総合評価
          </Badge>
        </div>

        {/* 詳細評価 */}
        <div className="space-y-1">
          <h4 className="font-medium text-gray-900 mb-3">詳細評価</h4>
          <StarRating score={avgDeadline} label="納期" />
          <StarRating score={avgQuality} label="成果品の質" />
          <StarRating score={avgCommunication} label="コミュニケーション" />
          <StarRating score={avgUnderstanding} label="理解度" />
          <StarRating score={avgProfessionalism} label="プロフェッショナリズム" />
        </div>
      </CardContent>
    </Card>
  )
}
