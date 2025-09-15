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
  const [pendingContracts, setPendingContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTab, setSelectedTab] = useState<'signed' | 'pending'>('signed')

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

      console.log('契約取得開始:', { userId: session.user.id, tokenLength: session.access_token.length })

      const response = await fetch('/api/contracts', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      console.log('契約取得APIレスポンス:', { status: response.status, statusText: response.statusText })

      const result = await response.json()
      console.log('契約取得API結果:', result)

      if (response.ok) {
        const allContracts = result.contracts || []
        console.log('契約データ取得成功:', { totalContracts: allContracts.length })
        
        if (allContracts.length === 0) {
          console.log('契約データなし - 空の配列を設定')
          setContracts([])
          setPendingContracts([])
        } else {
          // 署名済み契約と署名待ち契約を分ける
          const signedContracts = allContracts.filter(contract => 
            contract.status === 'signed' || contract.status === 'completed'
          )
          const pendingContracts = allContracts.filter(contract => 
            contract.status === 'pending' || contract.status === 'org_signed' || contract.status === 'contractor_signed'
          )
          
          console.log('契約分類完了:', { signedCount: signedContracts.length, pendingCount: pendingContracts.length })
          
          setContracts(signedContracts)
          setPendingContracts(pendingContracts)
        }
      } else {
        console.error('契約取得エラー:', result.message)
        setError(result.message || '契約データの取得に失敗しました')
      }
    } catch (err: any) {
      console.error('契約取得エラー:', err)
      setError(`サーバーエラーが発生しました: ${err.message || '不明なエラー'}`)
      setContracts([])
      setPendingContracts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (userProfile && userRole) {
      fetchContracts()
    }
  }, [userProfile, userRole])

  // 契約を月毎にグループ化
  const groupContractsByMonth = (contracts: Contract[]) => {
    const grouped = contracts.reduce((acc, contract) => {
      const date = new Date(contract.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthName = date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
      
      if (!acc[monthKey]) {
        acc[monthKey] = {
          monthName,
          contracts: []
        }
      }
      acc[monthKey].contracts.push(contract)
      return acc
    }, {} as Record<string, { monthName: string; contracts: Contract[] }>)

    // 月順でソート
    return Object.entries(grouped)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([_, data]) => data)
  }

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
        await fetchContracts()
      } else {
        setError(result.message || '契約の署名に失敗しました')
      }
    } catch (err: any) {
      console.error('契約署名エラー:', err)
      setError('サーバーエラーが発生しました')
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
          <p className="text-gray-600 mb-4">契約一覧を表示するにはログインしてください。</p>
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

          {/* タブ */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setSelectedTab('signed')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'signed'
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  署名済み契約
                  {contracts.length > 0 && (
                    <span className="ml-2 bg-engineering-blue text-white text-xs px-2 py-1 rounded-full">
                      {contracts.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setSelectedTab('pending')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === 'pending'
                      ? 'border-engineering-blue text-engineering-blue'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  署名待ち契約
                  {pendingContracts.length > 0 && (
                    <span className="ml-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      {pendingContracts.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>
          </div>

          {/* 契約一覧 */}
          {selectedTab === 'signed' ? (
            // 署名済み契約（月毎にグループ化）
            contracts.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">署名済み契約がありません</h3>
                <p className="text-gray-600">
                  まだ署名済みの契約がありません。
                </p>
              </Card>
            ) : (
              <div className="space-y-8">
                {groupContractsByMonth(contracts).map((monthGroup, monthIndex) => (
                  <div key={monthIndex}>
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2" />
                      {monthGroup.monthName}
                      <span className="ml-2 text-sm font-normal text-gray-500">
                        ({monthGroup.contracts.length}件)
                      </span>
                    </h2>
                    <div className="grid gap-4">
                      {monthGroup.contracts.map((contract) => (
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
                  </div>
                ))}
              </div>
            )
          ) : (
            // 署名待ち契約
            pendingContracts.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">署名待ち契約がありません</h3>
                <p className="text-gray-600">
                  {userRole === 'OrgAdmin' 
                    ? '現在、署名待ちの契約はありません。'
                    : '現在、署名待ちの契約はありません。'
                  }
                </p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {pendingContracts.map((contract) => (
                  <motion.div
                    key={contract.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card className="p-6 hover:shadow-lg transition-shadow border-l-4 border-l-yellow-400">
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
            )
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
