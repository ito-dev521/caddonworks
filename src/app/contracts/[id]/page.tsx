"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, ArrowLeft, CheckCircle, AlertCircle, User, DollarSign, Calendar, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useRouter, useParams } from "next/navigation"
import { supabase } from "@/lib/supabase"

interface Contract {
  id: string
  project_id: string
  org_id: string
  contractor_id: string
  contract_title: string
  contract_content: string
  bid_amount: number
  original_bid_amount?: number
  amount_adjusted?: boolean
  adjustment_comment?: string
  start_date: string
  end_date: string
  status: string
  contractor_signed_at?: string
  org_signed_at?: string
  signed_at?: string
  decline_reason?: string
  declined_at?: string
  created_at: string
  project_title?: string
  org_name?: string
  org_admin_name?: string
  contractor_name?: string
  contractor_email?: string
}

function ContractDetailPageContent() {
  const { userProfile, userRole } = useAuth()
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSigning, setIsSigning] = useState(false)
  const [showDeclineModal, setShowDeclineModal] = useState(false)
  const [declineComment, setDeclineComment] = useState('')
  const [isDeclining, setIsDeclining] = useState(false)

  // 契約情報を取得
  const fetchContract = async () => {
    if (!contractId) {
      setError('契約IDが指定されていません')
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

      const response = await fetch(`/api/contracts/${contractId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const result = await response.json()
        setContract(result.contract)
      } else {
        const result = await response.json()
        setError(result.message || '契約情報の取得に失敗しました')
      }

    } catch (err: any) {
      console.error('データ取得エラー:', err)
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile && userRole && contractId) {
      fetchContract()
    }
  }, [userProfile, userRole, contractId])

  // 契約に署名（受注者側）
  const handleSignContract = async () => {
    if (!contract) {
      setError('契約情報が見つかりません')
      return
    }

    try {
      setIsSigning(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      const response = await fetch(`/api/contracts/${contractId}/sign`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        // 契約情報を再取得
        await fetchContract()
        alert('契約に署名しました。発注者の署名待ちです。')
      } else {
        setError(result.message || '署名に失敗しました')
      }
    } catch (err: any) {
      console.error('署名エラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setIsSigning(false)
    }
  }

  // 契約に署名（発注者側）
  const handleSignContractAsOrg = async () => {
    if (!contract) {
      setError('契約情報が見つかりません')
      return
    }

    try {
      setIsSigning(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      const response = await fetch(`/api/contracts/${contractId}/sign-org`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        // 契約情報を再取得
        await fetchContract()
        alert('契約に署名しました。チャットルームでやりとりを開始できます。')
      } else {
        setError(result.message || '署名に失敗しました')
      }
    } catch (err: any) {
      console.error('署名エラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setIsSigning(false)
    }
  }

  // 契約を辞退
  const handleDeclineContract = async () => {
    if (!contract) {
      setError('契約情報が見つかりません')
      return
    }

    if (!declineComment.trim()) {
      setError('辞退理由の入力が必須です')
      return
    }

    try {
      setIsDeclining(true)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      const response = await fetch(`/api/contracts/${contractId}/decline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          comment: declineComment
        })
      })

      const result = await response.json()

      if (response.ok) {
        setShowDeclineModal(false)
        setDeclineComment('')
        alert('契約を辞退しました。発注者に通知が送信されます。')
        // 契約一覧ページにリダイレクト
        router.push('/contracts')
      } else {
        setError(result.message || '辞退に失敗しました')
      }
    } catch (err: any) {
      console.error('辞退エラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setIsDeclining(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">契約情報を読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!userProfile || !userRole) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">ログインが必要です</h2>
          <p className="text-gray-600 mb-4">契約詳細ページにアクセスするにはログインしてください。</p>
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
            <Button onClick={fetchContract} variant="engineering">
              再試行
            </Button>
            <Button onClick={() => router.push('/contracts')} variant="outline">
              契約一覧に戻る
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!contract) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">契約が見つかりません</h2>
          <p className="text-gray-600 mb-4">指定された契約が見つかりません。</p>
          <Button onClick={() => router.push('/contracts')} variant="engineering">
            契約一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  // 受注者の場合、自分の契約のみ表示可能
  if (userRole === 'Contractor' && contract.contractor_id !== userProfile.id) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">アクセス権限がありません</h2>
          <p className="text-gray-600 mb-4">この契約にアクセスする権限がありません。</p>
          <Button onClick={() => router.push('/contracts')} variant="engineering">
            契約一覧に戻る
          </Button>
        </div>
      </div>
    )
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_contractor':
        return <Badge variant="contractor" className="bg-yellow-100 text-yellow-800">受注者署名待ち</Badge>
      case 'pending_org':
        return <Badge variant="outline" className="bg-orange-100 text-orange-800">発注者署名待ち</Badge>
      case 'signed':
        return <Badge variant="default" className="bg-green-100 text-green-800">署名済み</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">完了</Badge>
      case 'declined':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">辞退済み</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // 金額調整が行われたかどうかを判定
  const isAmountAdjusted = () => {
    if (!contract) return false
    
    
    // データベースのamount_adjustedフィールドが明示的にtrueの場合
    if (contract.amount_adjusted === true) {
      return true
    }
    
    // フォールバック: 契約内容の文字列検索
    const hasAdjustmentText = contract.contract_content.includes('入札金額') && contract.contract_content.includes('から調整')
    return hasAdjustmentText
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
              onClick={() => router.push('/contracts')}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              契約一覧に戻る
            </Button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">契約詳細</h1>
                <p className="text-gray-600">{contract.project_title}</p>
              </div>
              {getStatusBadge(contract.status)}
            </div>
          </div>

          <div className="grid gap-6">
            {/* 契約基本情報 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                契約基本情報
              </h2>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">契約金額:</span>
                    <p className="text-2xl font-bold text-engineering-blue">¥{contract.bid_amount.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">契約期間:</span>
                    <p className="text-gray-900">
                      {new Date(contract.start_date).toLocaleDateString('ja-JP')} - {new Date(contract.end_date).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">発注者:</span>
                    <p className="font-medium text-gray-900">{contract.org_admin_name || contract.org_name}</p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600">受注者:</span>
                    <p className="font-medium text-gray-900">{contract.contractor_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm text-gray-600">契約作成日:</span>
                    <p className="text-gray-900">{new Date(contract.created_at).toLocaleString('ja-JP')}</p>
                  </div>
                  {contract.signed_at && (
                    <div>
                      <span className="text-sm text-gray-600">署名日:</span>
                      <p className="text-gray-900">{new Date(contract.signed_at).toLocaleString('ja-JP')}</p>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {/* 契約内容 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <CheckCircle className="w-5 h-5 mr-2" />
                契約内容
              </h2>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-900 mb-2">契約条件</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">案件名:</span>
                      <span className="text-blue-900">{contract.contract_title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">契約金額:</span>
                      <span className="font-medium text-blue-900">¥{contract.bid_amount.toLocaleString()}</span>
                    </div>
                    {isAmountAdjusted() && contract.original_bid_amount && (
                      <div className="flex justify-between">
                        <span className="text-blue-700">入札金額:</span>
                        <span className="text-blue-900">¥{contract.original_bid_amount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-blue-700">契約期間:</span>
                      <span className="text-blue-900">
                        {new Date(contract.start_date).toLocaleDateString('ja-JP')} - {new Date(contract.end_date).toLocaleDateString('ja-JP')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 金額調整情報 */}
                {isAmountAdjusted() && contract.adjustment_comment && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-orange-900 mb-2">金額調整について</h3>
                    <div className="text-sm text-orange-800">
                      <p className="mb-2">
                        <span className="font-medium">調整理由:</span> {contract.adjustment_comment}
                      </p>
                      <p className="text-xs text-orange-600">
                        この契約は入札金額から調整されています。
                      </p>
                    </div>
                  </div>
                )}

                {/* 辞退情報 */}
                {contract.status === 'declined' && contract.decline_reason && (
                  <div className="bg-red-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-red-900 mb-2">契約辞退について</h3>
                    <div className="text-sm text-red-800">
                      <p className="mb-2">
                        <span className="font-medium">辞退理由:</span> {contract.decline_reason}
                      </p>
                      {contract.declined_at && (
                        <p className="text-xs text-red-600">
                          辞退日時: {new Date(contract.declined_at).toLocaleString('ja-JP')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-2">契約書内容</h3>
                  <div className="text-sm text-gray-700 whitespace-pre-line">
                    {contract.contract_content
                      .replace(/受注者: [a-f0-9-]+/g, `受注者: ${contract.contractor_name}`)
                      .replace(/発注者: [a-f0-9-]+/g, `発注者: ${contract.org_admin_name || contract.org_name}`)
                    }
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-yellow-900 mb-2">契約条項</h3>
                  <ul className="text-sm text-yellow-800 space-y-1">
                    <li>• 受注者は契約期間内に案件を完了する義務があります</li>
                    <li>• 発注者は契約金額を契約完了後に支払います</li>
                    <li>• 品質基準に満たない場合は再作業が必要です</li>
                    <li>• 契約の変更は双方の合意が必要です</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* アクションボタン */}
            {userRole === 'Contractor' && contract.status === 'pending_contractor' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <PenTool className="w-5 h-5 mr-2" />
                  署名
                </h2>
                <div className="space-y-4">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-yellow-900 mb-2">署名前の確認</h3>
                    <ul className="text-sm text-yellow-800 space-y-1">
                      <li>• 契約内容を十分に確認してください</li>
                      <li>• 署名後は契約が有効になります</li>
                      <li>• 署名後はチャットルームでやりとりが可能になります</li>
                    </ul>
                  </div>
                  <div className="flex justify-between">
                    {/* 金額調整が行われた場合のみ辞退ボタンを表示 */}
                    {(() => {
                      const adjusted = isAmountAdjusted()
                      return adjusted
                    })() && (
                      <Button
                        onClick={() => setShowDeclineModal(true)}
                        variant="outline"
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        契約を辞退
                      </Button>
                    )}
                    <Button
                      onClick={handleSignContract}
                      disabled={isSigning}
                      variant="engineering"
                      className="min-w-[120px] ml-auto"
                    >
                      {isSigning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          署名中...
                        </>
                      ) : (
                        <>
                          <PenTool className="w-4 h-4 mr-2" />
                          契約に署名
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* 発注者側の署名ボタン */}
            {userRole === 'OrgAdmin' && contract.status === 'pending_org' && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <PenTool className="w-5 h-5 mr-2" />
                  発注者署名
                </h2>
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900 mb-2">受注者署名済み</h3>
                    <p className="text-sm text-blue-800">
                      受注者が契約に署名しました。発注者として署名を完了してください。
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSignContractAsOrg}
                      disabled={isSigning}
                      variant="engineering"
                      className="min-w-[120px]"
                    >
                      {isSigning ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          署名中...
                        </>
                      ) : (
                        <>
                          <PenTool className="w-4 h-4 mr-2" />
                          発注者として署名
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {contract.status === 'signed' && (
              <Card className="p-6">
                <div className="text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">契約が署名済みです</h2>
                  <p className="text-gray-600 mb-4">この契約は有効です。チャットルームでやりとりを開始できます。</p>
                  <Button
                    onClick={() => router.push('/chat')}
                    variant="engineering"
                  >
                    チャットルームへ
                  </Button>
                </div>
              </Card>
            )}

            {/* 辞退モーダル */}
            {showDeclineModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">契約の辞退</h3>
                  <p className="text-gray-600 mb-4">
                    契約を辞退する理由を入力してください。この内容は発注者に通知されます。
                  </p>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      辞退理由 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={declineComment}
                      onChange={(e) => setDeclineComment(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                      placeholder="辞退理由を入力してください"
                      rows={4}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => {
                        setShowDeclineModal(false)
                        setDeclineComment('')
                      }}
                      variant="outline"
                    >
                      キャンセル
                    </Button>
                    <Button
                      onClick={handleDeclineContract}
                      disabled={isDeclining || !declineComment.trim()}
                      variant="destructive"
                    >
                      {isDeclining ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          辞退中...
                        </>
                      ) : (
                        '契約を辞退'
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function ContractDetailPage() {
  return (
    <AuthGuard>
      <ContractDetailPageContent />
    </AuthGuard>
  )
}
