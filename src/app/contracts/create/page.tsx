"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, ArrowLeft, CheckCircle, AlertCircle, User, DollarSign, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface Bid {
  id: string
  project_id: string
  contractor_id: string
  bid_amount: number
  message: string
  created_at: string
  contractor_name?: string
  contractor_email?: string
  project_title?: string
}

interface Project {
  id: string
  title: string
  description: string
  budget: number
  start_date: string
  end_date: string
  category: string
  org_id: string
  org_name?: string
}

function CreateContractPageContent() {
  const { userProfile, userRole } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = searchParams.get('projectId')
  const bidId = searchParams.get('bidId')

  const [project, setProject] = useState<Project | null>(null)
  const [bid, setBid] = useState<Bid | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [adjustedAmount, setAdjustedAmount] = useState<number>(0)
  const [isAmountAdjusted, setIsAmountAdjusted] = useState(false)
  const [adjustmentComment, setAdjustmentComment] = useState<string>('')

  // 金額のフォーマット関数
  const formatAmount = (value: number | string): string => {
    const numValue = typeof value === 'string' ? parseInt(value.replace(/,/g, '')) || 0 : value
    return numValue.toLocaleString('ja-JP')
  }

  // 金額のパース関数
  const parseAmount = (value: string): number => {
    return parseInt(value.replace(/,/g, '')) || 0
  }

  // 案件と入札情報を取得
  const fetchProjectAndBid = async () => {
    
    if (!projectId || !bidId) {
      console.error('契約作成ページ: パラメータ不足', { projectId, bidId })
      setError('案件IDまたは入札IDが指定されていません')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }


      // 案件情報を取得
      const projectResponse = await fetch(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (projectResponse.ok) {
        const projectResult = await projectResponse.json()
        setProject(projectResult.project)
      } else {
        const projectError = await projectResponse.json()
        console.error('契約作成ページ: 案件取得エラー', { status: projectResponse.status, error: projectError })
        setError(`案件の取得に失敗しました: ${projectError.message || '不明なエラー'}`)
        return
      }

      // 入札情報を取得
      const bidResponse = await fetch(`/api/bids/${bidId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (bidResponse.ok) {
        const bidResult = await bidResponse.json()
        setBid(bidResult.bid)
        // 調整金額を入札金額で初期化
        setAdjustedAmount(bidResult.bid.bid_amount)
      } else {
        const bidError = await bidResponse.json()
        console.error('契約作成ページ: 入札取得エラー', { status: bidResponse.status, error: bidError })
        setError(`入札情報の取得に失敗しました: ${bidError.message || '不明なエラー'}`)
        return
      }

    } catch (err: any) {
      console.error('データ取得エラー:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile && userRole && projectId && bidId) {
      fetchProjectAndBid()
    }
  }, [userProfile, userRole, projectId, bidId])

  // 契約を作成
  const handleCreateContract = async () => {
    if (!project || !bid) {
      setError('案件または入札情報が見つかりません')
      return
    }

    // 金額打診時のコメント必須チェック
    if (isAmountAdjusted && !adjustmentComment.trim()) {
      setError('金額を打診する場合は、変更理由・コメントの入力が必須です')
      return
    }

    try {
      setIsCreating(true)
      setError(null) // エラーをクリア
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      // Step 1: 入札承認（Boxフォルダ作成は別途実行）
      const bidApprovalPromise = fetch(`/api/bids/${bid.id}/negotiate`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'approve',
          skip_box_creation: false // BOXフォルダ作成を有効化
        })
      })

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('入札承認処理がタイムアウトしました')), 10000) // 10秒でタイムアウト
      })

      const bidApprovalResponse = await Promise.race([bidApprovalPromise, timeoutPromise]) as Response

      if (!bidApprovalResponse.ok) {
        const bidApprovalError = await bidApprovalResponse.json()
        console.error('入札承認エラー:', bidApprovalError)
        setError(`入札承認に失敗しました: ${bidApprovalError.message || '不明なエラー'}`)
        return
      }

      const bidApprovalResult = await bidApprovalResponse.json()

      // Step 2: 契約作成
      const contractResponse = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          project_id: project.id,
          bid_id: bid.id,
          contract_amount: adjustedAmount,
          original_bid_amount: bid.bid_amount,
          amount_adjusted: isAmountAdjusted,
          adjustment_comment: adjustmentComment,
          start_date: project.start_date,
          end_date: project.end_date,
          contractor_id: bid.contractor_id,
          org_id: project.org_id
        })
      })

      const contractResult = await contractResponse.json()

      if (contractResponse.ok) {
        // 契約一覧ページに遷移
        router.push('/contracts')
      } else {
        console.error('契約作成エラー:', contractResult)
        setError(contractResult.message || '契約の作成に失敗しました')
      }
    } catch (err: any) {
      console.error('契約作成プロセスエラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setIsCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">認証確認中...</p>
        </div>
      </div>
    )
  }

  if (!userProfile || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ログインが必要です</h2>
          <p className="text-gray-600 mb-4">契約作成ページにアクセスするにはログインしてください。</p>
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
          <div className="space-y-2">
            <Button onClick={fetchProjectAndBid} variant="engineering">
              再試行
            </Button>
            <Button onClick={() => router.push('/projects')} variant="outline">
              案件一覧に戻る
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!project || !bid) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">データが見つかりません</h2>
          <p className="text-gray-600 mb-4">案件または入札情報が見つかりません。</p>
          <Button onClick={() => router.push('/projects')} variant="engineering">
            案件一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto"
        >
          {/* ヘッダー */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/projects')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              案件一覧に戻る
            </Button>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">契約書作成</h1>
            <p className="text-gray-600">入札を承認して契約書を作成します</p>
          </div>

          <div className="grid gap-6">
            {/* 案件情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                案件情報
              </h2>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">案件名:</span>
                  <p className="font-medium text-gray-900">{project.title}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">説明:</span>
                  <p className="text-gray-900">{project.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">予算:</span>
                    <p className="font-medium text-gray-900">¥{project.budget.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">カテゴリ:</span>
                    <p className="text-gray-900">{project.category}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">開始日:</span>
                    <p className="text-gray-900">{new Date(project.start_date).toLocaleDateString('ja-JP')}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">終了日:</span>
                    <p className="text-gray-900">{new Date(project.end_date).toLocaleDateString('ja-JP')}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* 入札情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                入札情報
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-gray-600">受注者:</span>
                    <p className="font-medium text-gray-900">{bid.contractor_name}</p>
                  </div>
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    承認済み
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-gray-600">入札金額:</span>
                  <p className="text-2xl font-bold text-engineering-blue">¥{bid.bid_amount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">入札メッセージ:</span>
                  <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                    {bid.message || 'メッセージはありません'}
                  </p>
                </div>
                <div>
                  <span className="text-sm text-gray-600">入札日時:</span>
                  <p className="text-gray-900">{new Date(bid.created_at).toLocaleString('ja-JP')}</p>
                </div>
              </div>
            </Card>

            {/* 契約内容確認 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                契約内容確認
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">契約条件</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">入札金額:</span>
                      <span className="text-blue-900">¥{bid.bid_amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">契約期間:</span>
                      <span className="text-blue-900">
                        {new Date(project.start_date).toLocaleDateString('ja-JP')} - {new Date(project.end_date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">受注者:</span>
                      <span className="text-blue-900">{bid.contractor_name}</span>
                    </div>
                  </div>
                </div>

                {/* 金額打診セクション - 金額を変更した場合のみ表示 */}
                {isAmountAdjusted && (
                  <div className="bg-green-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-green-900 mb-3">契約金額の打診</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          契約金額 (円)
                        </label>
                        <input
                          type="text"
                          value={formatAmount(adjustedAmount)}
                          onChange={(e) => {
                            const newAmount = parseAmount(e.target.value)
                            setAdjustedAmount(newAmount)
                            setIsAmountAdjusted(newAmount !== bid.bid_amount)
                          }}
                          className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="契約金額を入力（例：100,000）"
                        />
                        <p className="mt-1 text-sm text-green-600">
                          入札金額から {adjustedAmount > bid.bid_amount ? '+' : ''}{formatAmount(adjustedAmount - bid.bid_amount)}円 変更しています
                        </p>
                      </div>

                      {/* 金額打診時のコメント入力 */}
                      <div>
                        <label className="block text-sm font-medium text-green-700 mb-2">
                          金額変更の理由・コメント <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={adjustmentComment}
                          onChange={(e) => setAdjustmentComment(e.target.value)}
                          className="w-full px-3 py-2 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          placeholder="中間とってこの金額でどうですか？"
                          rows={3}
                          required
                        />
                        <p className="mt-1 text-sm text-green-600">
                          このコメントは受注者に通知されます
                        </p>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustedAmount(bid.bid_amount)
                            setIsAmountAdjusted(false)
                            setAdjustmentComment('')
                          }}
                          className="text-green-700 border-green-300 hover:bg-green-100"
                        >
                          入札金額に戻す
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustedAmount(project.budget)
                            setIsAmountAdjusted(project.budget !== bid.bid_amount)
                          }}
                          className="text-green-700 border-green-300 hover:bg-green-100"
                        >
                          予算金額にする
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 金額変更ボタン - 入札金額で同意の場合のみ表示 */}
                {!isAmountAdjusted && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-900 mb-3">契約金額</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-700">入札金額で契約します</span>
                        <span className="font-medium text-gray-900">¥{bid.bid_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setAdjustedAmount(project.budget)
                            setIsAmountAdjusted(project.budget !== bid.bid_amount)
                          }}
                          className="text-gray-700 border-gray-300 hover:bg-gray-100"
                        >
                          金額を打診する
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">注意事項</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• 契約書を作成すると、受注者に通知が送信されます</li>
                    <li>• 受注者が署名すると契約が有効になります</li>
                    <li>• 契約金額は上記で設定した金額になります</li>
                    <li>• 金額を打診した場合は、受注者に変更内容が通知されます</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* アクションボタン */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/projects')}
                disabled={isCreating}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleCreateContract}
                disabled={isCreating}
                variant="engineering"
                className="min-w-[120px]"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    作成中...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {isAmountAdjusted ? '金額打診して契約を作成' : '契約書を作成'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function CreateContractPage() {
  return (
    <AuthGuard requiredRole="OrgAdmin">
      <CreateContractPageContent />
    </AuthGuard>
  )
}
