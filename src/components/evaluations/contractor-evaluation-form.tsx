'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Star, StarIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface ContractorEvaluationFormProps {
  projectId: string
  contractId: string
  contractorId: string
  contractorName: string
  onSuccess: () => void
  onCancel: () => void
}

interface EvaluationData {
  deadline_score: number
  quality_score: number
  communication_score: number
  understanding_score: number
  professionalism_score: number
  comment: string
}

const evaluationCriteria = [
  {
    key: 'deadline_score' as keyof EvaluationData,
    label: '納期',
    description: '約束した納期を守れていたか'
  },
  {
    key: 'quality_score' as keyof EvaluationData,
    label: '成果品の質',
    description: '提出された成果品の品質は満足できるものだったか'
  },
  {
    key: 'communication_score' as keyof EvaluationData,
    label: 'コミュニケーション',
    description: '連絡や報告は適切で分かりやすかったか'
  },
  {
    key: 'understanding_score' as keyof EvaluationData,
    label: '理解度',
    description: '要求事項を正しく理解し対応できていたか'
  },
  {
    key: 'professionalism_score' as keyof EvaluationData,
    label: 'プロフェッショナリズム',
    description: '専門性と責任感を持って業務に取り組んでいたか'
  }
]

export function ContractorEvaluationForm({
  projectId,
  contractId,
  contractorId,
  contractorName,
  onSuccess,
  onCancel
}: ContractorEvaluationFormProps) {
  const [evaluation, setEvaluation] = useState<EvaluationData>({
    deadline_score: 0,
    quality_score: 0,
    communication_score: 0,
    understanding_score: 0,
    professionalism_score: 0,
    comment: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleScoreChange = (criteria: keyof EvaluationData, score: number) => {
    setEvaluation(prev => ({
      ...prev,
      [criteria]: score
    }))
  }

  const handleCommentChange = (comment: string) => {
    setEvaluation(prev => ({
      ...prev,
      comment
    }))
  }

  const isFormValid = () => {
    return evaluation.deadline_score > 0 &&
           evaluation.quality_score > 0 &&
           evaluation.communication_score > 0 &&
           evaluation.understanding_score > 0 &&
           evaluation.professionalism_score > 0
  }

  const handleSubmit = async () => {
    if (!isFormValid()) {
      setError('すべての評価項目を選択してください')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      // 認証トークンを取得
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('認証が必要です。ログインし直してください。')
        setIsSubmitting(false)
        return
      }

      const requestData = {
        project_id: projectId,
        contract_id: contractId,
        contractor_id: contractorId,
        ...evaluation
      }

      const response = await fetch('/api/evaluations/contractor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(requestData)
      })

      const result = await response.json()

      if (response.ok) {
        onSuccess()
      } else {
        setError(result.message || '評価の保存に失敗しました')
      }
    } catch (error) {
      console.error('評価送信エラー:', error)
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsSubmitting(false)
    }
  }

  const StarRating = ({ 
    score, 
    onScoreChange, 
    label, 
    description 
  }: { 
    score: number
    onScoreChange: (score: number) => void
    label: string
    description: string
  }) => (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <p className="text-xs text-gray-500">{description}</p>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onScoreChange(star)}
            className="focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                star <= score
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 hover:text-yellow-200'
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-600">
          {score > 0 ? `${score}/5` : '未評価'}
        </span>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    >
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-xl font-bold text-gray-900">
            受注者評価
          </CardTitle>
          <p className="text-sm text-gray-600">
            {contractorName} さんへの評価をお願いします
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            {evaluationCriteria.map((criteria) => (
              <StarRating
                key={criteria.key}
                score={evaluation[criteria.key] as number}
                onScoreChange={(score) => handleScoreChange(criteria.key, score)}
                label={criteria.label}
                description={criteria.description}
              />
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              コメント（任意）
            </label>
            <Textarea
              value={evaluation.comment}
              onChange={(e) => handleCommentChange(e.target.value)}
              placeholder="受注者へのコメントがあれば記入してください..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              キャンセル
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!isFormValid() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  送信中...
                </>
              ) : (
                '評価を送信'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
