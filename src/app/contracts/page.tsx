"use client"

import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { FileText, Calendar, User, DollarSign, CheckCircle, Clock, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/contexts/auth-context"
import { AuthGuard } from "@/components/auth/auth-guard"

interface Contract {
  id: string
  project_id: string
  org_id: string
  contractor_id: string
  bid_id: string
  contract_amount: number
  start_date: string
  end_date: string
  status: string
  contract_url?: string
  org_signed_at?: string
  contractor_signed_at?: string
  created_at: string
  updated_at: string
  project_title?: string
  org_name?: string
  contractor_name?: string
  contractor_email?: string
}

function ContractsPageContent() {
  const { userProfile, userRole } = useAuth()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 契約一覧を取得
  const fetchContracts = async () => {
    try {
      setLoading(true)
      const { supabase } = await import("@/lib/supabase")
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        console.error('セッション取得エラー:', sessionError)
        setError('認証が必要です')
        return
      }

      console.log('契約取得開始:', { userId: session.user.id })

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      const result = await response.json()

      if (response.ok) {
        setContracts(result.contracts || [])
      } else {
        setError(result.message || '契約データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('契約取得エラー:', err)
      setError('サーバーエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile && userRole) {
      fetchContracts()
    }
  }, [userProfile, userRole])

  // ステータスに応じたバッジの色を取得
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />待機中</Badge>
      case 'org_signed':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><FileText className="w-3 h-3 mr-1" />発注者署名済み</Badge>
      case 'contractor_signed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />受注者署名済み</Badge>
      case 'signed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />契約完了</Badge>
      case 'cancelled':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />キャンセル</Badge>
      case 'completed':
        return <Badge variant="default" className="bg-purple-100 text-purple-800"><CheckCircle className="w-3 h-3 mr-1" />完了</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  // 契約の署名処理
  const handleSignContract = async (contractId: string) => {
    try {
      const { supabase } = await import("@/lib/supabase")
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
        // 契約一覧を再取得
        fetchContracts()
      } else {
        setError(result.message || '契約の署名に失敗しました')
      }
    } catch (err: any) {
      console.error('契約署名エラー:', err)
      setError('サーバーエラーが発生しました')
    }
  }

  if (!userProfile || !userRole || loading) {
    return (
      <div className="min-h-screen bg-gradient-mesh flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-engineering-blue mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!userProfile || !userRole ? 'ユーザー情報を読み込み中...' : '契約データを読み込み中...'}
          </p>
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
          <Button onClick={fetchContracts} variant="engineering">
            再試行
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
          className="max-w-6xl mx-auto"
        >
          {/* ヘッダー */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">契約管理</h1>
            <p className="text-gray-600">
              {userRole === 'OrgAdmin' ? '発注者としての契約一覧' : '受注者としての契約一覧'}
            </p>
          </div>

          {/* 契約一覧 */}
          {contracts.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">契約がありません</h3>
              <p className="text-gray-600">
                {userRole === 'OrgAdmin' 
                  ? 'まだ契約が作成されていません。案件から契約を作成してください。'
                  : 'まだ契約がありません。入札が承認されると契約が作成されます。'
                }
              </p>
            </Card>
          ) : (
            <div className="grid gap-6">
              {contracts.map((contract) => (
                <motion.div
                  key={contract.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="p-6 hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {contract.project_title || '案件名不明'}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {userRole === 'OrgAdmin' ? contract.contractor_name : contract.org_name}
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            ¥{contract.contract_amount.toLocaleString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(contract.start_date).toLocaleDateString('ja-JP')} - {new Date(contract.end_date).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusBadge(contract.status)}
                        {contract.status === 'pending' && userRole === 'Contractor' && (
                          <Button
                            onClick={() => handleSignContract(contract.id)}
                            variant="engineering"
                            size="sm"
                          >
                            署名する
                          </Button>
                        )}
                        {contract.status === 'org_signed' && userRole === 'Contractor' && (
                          <Button
                            onClick={() => handleSignContract(contract.id)}
                            variant="engineering"
                            size="sm"
                          >
                            署名する
                          </Button>
                        )}
                        {contract.status === 'contractor_signed' && userRole === 'OrgAdmin' && (
                          <Button
                            onClick={() => handleSignContract(contract.id)}
                            variant="engineering"
                            size="sm"
                          >
                            署名する
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 署名状況 */}
                    <div className="border-t pt-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">発注者署名:</span>
                          <span className={`ml-2 ${contract.org_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                            {contract.org_signed_at 
                              ? new Date(contract.org_signed_at).toLocaleString('ja-JP')
                              : '未署名'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">受注者署名:</span>
                          <span className={`ml-2 ${contract.contractor_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
                            {contract.contractor_signed_at 
                              ? new Date(contract.contractor_signed_at).toLocaleString('ja-JP')
                              : '未署名'
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}

export default function ContractsPage() {
  return (
    <AuthGuard allowedRoles={['OrgAdmin', 'Contractor']}>
      <ContractsPageContent />
    </AuthGuard>
  )
}
