"use client"

import React, { useEffect, useState } from "react"
import { Navigation } from "@/components/layouts/navigation"
import { motion } from "framer-motion"
import { Users, Search, CheckCircle2, XCircle, User, Play, Pause, Trash2 } from "lucide-react"
import { AuthGuard } from "@/components/auth/auth-guard"
import { Badge } from "@/components/ui/badge"
import { getMemberLevelInfo } from "@/lib/member-level"

interface Contractor {
  id: string
  email: string
  display_name: string
  organization?: string
  role: string
  active: boolean
  created_at: string
  formal_name?: string
  phone_number?: string
  member_level?: string
}

function AdminContractorsPageContent() {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [q, setQ] = useState("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchContractors = async () => {
      setLoading(true)
      try {
        // 認証トークンを取得
        const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession()
        const token = session?.access_token || ''

        const res = await fetch("/api/admin/contractors", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        if (res.ok) {
          const json = await res.json()
          setContractors(json.contractors || [])
        } else {
          console.error('Failed to fetch contractors:', res.status)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchContractors()
  }, [])

  const handleActiveToggle = async (contractorId: string, currentActive: boolean) => {
    if (!confirm(`受注者を${currentActive ? '停止' : '有効化'}しますか？`)) return

    setActionLoading(contractorId)
    try {
      // 認証トークンを取得
      const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/admin/users/${contractorId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ active: !currentActive })
      })

      if (res.ok) {
        setContractors(prev => prev.map(c => c.id === contractorId ? { ...c, active: !c.active } : c))
        alert(`受注者を${currentActive ? '停止' : '有効化'}しました`)
      } else {
        const error = await res.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (e) {
      console.error(e)
      alert('処理中にエラーが発生しました')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (contractorId: string, contractorName: string) => {
    if (!confirm(`「${contractorName}」を完全に削除しますか？\n\n注意: この操作は取り消せません。`)) return

    setActionLoading(contractorId)
    try {
      // 認証トークンを取得
      const { data: { session } } = await (await import("@/lib/supabase")).supabase.auth.getSession()
      const token = session?.access_token || ''

      const res = await fetch(`/api/admin/users/${contractorId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (res.ok) {
        setContractors(prev => prev.filter(c => c.id !== contractorId))
        alert('受注者を削除しました')
      } else {
        const error = await res.json()
        alert(`エラー: ${error.message}`)
      }
    } catch (e) {
      console.error(e)
      alert('処理中にエラーが発生しました')
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = contractors
    .filter(c =>
      c.display_name?.toLowerCase().includes(q.toLowerCase()) ||
      c.email?.toLowerCase().includes(q.toLowerCase()) ||
      c.organization?.toLowerCase().includes(q.toLowerCase())
    )
    .filter(c => {
      if (filterStatus === "all") return true
      if (filterStatus === "active") return c.active
      if (filterStatus === "inactive") return !c.active
      return true
    })

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="w-6 h-6 text-engineering-blue" />
              個人事業主管理
            </h1>
            <p className="text-gray-600 mt-1">受注者（個人事業主）の管理・利用状況確認</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="氏名、メール、屋号で検索"
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
                />
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-engineering-blue focus:border-transparent"
              >
                <option value="all">全ての状態</option>
                <option value="active">稼働中</option>
                <option value="inactive">停止中</option>
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {loading ? (
              <p className="text-gray-600">読み込み中...</p>
            ) : (
              filtered.map(contractor => (
                <div key={contractor.id} className="bg-white border border-gray-200 rounded-xl p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="font-semibold text-gray-900 text-lg">
                          {contractor.display_name || 'ユーザー'}
                        </div>
                        {contractor.active ? (
                          <span className="text-green-600 flex items-center gap-1 text-sm">
                            <CheckCircle2 className="w-4 h-4" />稼働中
                          </span>
                        ) : (
                          <span className="text-red-600 flex items-center gap-1 text-sm">
                            <XCircle className="w-4 h-4" />停止中
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div>メール: {contractor.email}</div>
                        <div>屋号: {contractor.organization || '個人事業主'}</div>
                        <div>登録日: {new Date(contractor.created_at).toLocaleDateString('ja-JP')}</div>
                        {contractor.formal_name && contractor.formal_name !== contractor.display_name && (
                          <div>正式名: {contractor.formal_name}</div>
                        )}
                        {contractor.phone_number && (
                          <div>電話: {contractor.phone_number}</div>
                        )}
                        {contractor.member_level && (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600">レベル:</span>
                            {(() => {
                              const levelInfo = getMemberLevelInfo(contractor.member_level as any)
                              return (
                                <Badge className={levelInfo.color}>
                                  {levelInfo.label}
                                </Badge>
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-sm flex items-center gap-1">
                        <User className="w-4 h-4" />
                        個人事業主
                      </div>

                      {/* 稼働停止・有効化ボタン */}
                      <button
                        onClick={() => handleActiveToggle(contractor.id, contractor.active)}
                        disabled={actionLoading === contractor.id}
                        className={`px-3 py-1 rounded-lg text-sm font-medium flex items-center gap-1 ${
                          contractor.active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {actionLoading === contractor.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : contractor.active ? (
                          <>
                            <Pause className="w-4 h-4" />
                            停止
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            有効化
                          </>
                        )}
                      </button>

                      {/* 削除ボタン */}
                      <button
                        onClick={() => handleDelete(contractor.id, contractor.display_name || contractor.email)}
                        disabled={actionLoading === contractor.id}
                        className="px-3 py-1 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-sm font-medium flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading === contractor.id ? (
                          <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            削除
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default function AdminContractorsPage() {
  return (
    <AuthGuard>
      <AdminContractorsPageContent />
    </AuthGuard>
  )
}